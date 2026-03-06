import {
  defaultConfig,
  expect,
  shortNodeRemote,
  sourceBrowsingRid,
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

test("unreachable node shows error with seed selector", async ({ page }) => {
  await page.goto("/nodes/this.node.does.not.exist.xyz", {
    waitUntil: "networkidle",
  });

  // Shows the error title with the unreachable hostname.
  await expect(page.getByText("Could not connect to")).toBeVisible();
  await expect(page.getByText("this.node.does.not.exist.xyz")).toBeVisible();

  // Shows the description.
  await expect(
    page.getByText("The node may be offline or the address may be incorrect."),
  ).toBeVisible();
  await expect(
    page.getByText("Select a different node to continue."),
  ).toBeVisible();

  // Shows the seed selector dropdown toggle.
  await expect(
    page.getByRole("button", { name: "Toggle seed selector dropdown" }),
  ).toBeVisible();

  // Bookmark button is not shown in compact mode.
  await expect(
    page.getByRole("button", { name: "Add bookmark" }),
  ).not.toBeVisible();
});

test("seed selector on not-found page allows navigating to a working node", async ({
  page,
}) => {
  await page.goto("/nodes/this.node.does.not.exist.xyz", {
    waitUntil: "networkidle",
  });

  await expect(page.getByText("Could not connect to")).toBeVisible();

  // Open the seed selector and navigate to the working local node.
  await page
    .getByRole("button", { name: "Toggle seed selector dropdown" })
    .click();
  await page.getByPlaceholder("seed.radicle.example").fill("localhost");
  await page.getByPlaceholder("seed.radicle.example").press("Enter");

  // Should navigate to the working node.
  await expect(page).toHaveURL("/nodes/localhost");
  await expect(page.getByText("source-browsing")).toBeVisible();
});

test("unreachable seed on repo page shows error with seed selector", async ({
  page,
}) => {
  await page.goto(`/nodes/this.node.does.not.exist.xyz/${sourceBrowsingRid}`, {
    waitUntil: "networkidle",
  });

  await expect(page.getByText("Could not connect to")).toBeVisible();
  await expect(page.getByText("this.node.does.not.exist.xyz")).toBeVisible();

  // Seed selector is available to navigate away.
  await expect(
    page.getByRole("button", { name: "Toggle seed selector dropdown" }),
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
            .replace("seed.example.tld", "localhost"),
        },
      }),
  );

  await page.goto("/");

  await page
    .getByRole("button", { name: "Toggle seed selector dropdown" })
    .click();
  await expect(page.getByPlaceholder("seed.radicle.example")).toHaveValue(
    "localhost",
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
  await page.getByRole("link", { name: "Home" }).click();
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
