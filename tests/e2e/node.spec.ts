import {
  defaultConfig,
  expect,
  shortNodeRemote,
  test,
} from "@tests/support/fixtures.js";

test("node metadata", async ({ page, peerManager }) => {
  const peer = await peerManager.createPeer({
    name: "node-metadata-peer",
  });
  await peer.startNode({
    node: {
      ...defaultConfig.node,
      seedingPolicy: { default: "allow", scope: "all" },
      alias: "palm",
      externalAddresses: ["seed.radicle.test:8123"],
    },
  });
  await peer.startHttpd();

  await page.goto(peer.uiUrl());

  await expect(page.getByText(shortNodeRemote).first()).toBeVisible();
  await expect(page.getByText(/\/radicle:\d\//)).toBeVisible();
});

test("node repos", async ({ page }) => {
  await page.goto("/nodes/localhost");
  const repo = page
    .locator(".repo-card", { hasText: "source-browsing" })
    .nth(0);

  // Repo metadata.
  {
    await expect(repo.getByText("source-browsing")).toBeVisible();
    await expect(
      repo.getByText("Git repository for source browsing tests"),
    ).toBeVisible();
  }
});

test("show pinned repositories", async ({ page }) => {
  await page.goto("/");
  // Shows pinned repo name.
  await expect(page.getByText("source-browsing")).toBeVisible();
  //
  // Shows pinned repo description.
  await expect(
    page.getByText("Git repository for source browsing tests"),
  ).toBeVisible();
});

test("edit seed bookmarks", async ({ page }) => {
  // Proxy requests to seed.example.tld to the local test api.
  await page.route(
    url => url.hostname === "seed.example.tld",
    route =>
      route.fulfill({
        status: 301,
        headers: {
          Location: route
            .request()
            .url()
            .replace("seed.example.tld", "127.0.0.1"),
        },
      }),
  );

  await page.goto("/");

  await page
    .getByRole("button", { name: "Toggle seed selector dropdown" })
    .click();
  await expect(page.getByPlaceholder("seed.radicle.example")).toHaveValue(
    "127.0.0.1",
  );
  await expect(
    page.getByRole("button", { name: "Default seeds can't be removed" }),
  ).toBeVisible();
  await expect(page.locator(".dropdown > .dropdown-item")).toHaveCount(1);

  // The input box is focussed, has the text selected and ready to be overwritten.
  await page.getByPlaceholder("seed.radicle.example").fill("seed.example.tld");
  await page.getByPlaceholder("seed.radicle.example").press("Enter");

  await expect(page).toHaveURL("/nodes/seed.example.tld");
  await expect(
    page.getByRole("button", { name: "Add bookmark" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Toggle seed selector dropdown" })
    .click();

  // After navigating to the seed it should not yet be added to the bookmarks.
  await expect(page.locator(".dropdown > .dropdown-item")).toHaveCount(1);

  await page.getByRole("button", { name: "Add bookmark" }).click();
  await expect(page.locator(".dropdown > .dropdown-item")).toHaveCount(2);

  // Test that new seed is persisted and opened when we go to the landing page.
  await page.getByRole("link", { name: "Radicle logo" }).click();
  await expect(page.getByText("seed.example.tld").first()).toBeVisible();

  // Test removing a bookmark.
  await page
    .getByRole("button", { name: "Toggle seed selector dropdown" })
    .click();
  await page.getByRole("button", { name: "Remove bookmark" }).nth(1).click();
  await expect(page.locator(".dropdown > .dropdown-item")).toHaveCount(1);

  // Remove the bookmark from within the dropdown.
  await page.getByRole("button", { name: "Add bookmark" }).click();
  await expect(page.locator(".dropdown > .dropdown-item")).toHaveCount(2);
  await page
    .getByRole("button", { name: "seed.example.tld" })
    .getByRole("button", { name: "Remove bookmark" })
    .click();
  await expect(page.locator(".dropdown > .dropdown-item")).toHaveCount(1);
});
