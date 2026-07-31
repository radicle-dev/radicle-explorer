import * as Fs from "node:fs/promises";
import * as Path from "node:path";

import {
  aliceMainCommitCount,
  aliceMainHead,
  aliceRemote,
  cobUrl,
  expect,
  sourceBrowsingUrl,
  test,
} from "@tests/support/fixtures.js";
import { createRepo } from "@tests/support/repo";
import {
  expectBackAndForwardNavigationWorks,
  expectUrlPersistsReload,
} from "@tests/support/router.js";

test("navigate between landing and repo page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");

  await page.getByText("source-browsing").click();
  await expect(page).toHaveURL(sourceBrowsingUrl);

  await expectBackAndForwardNavigationWorks("/", page);
  await expectUrlPersistsReload(page);
});

test("navigation between node and repo pages", async ({ page }) => {
  await page.goto("/nodes/localhost");

  const repo = page
    .locator(".repo-card", { hasText: "source-browsing" })
    .nth(0);
  await repo.click();
  await expect(page).toHaveURL(sourceBrowsingUrl);

  await expectBackAndForwardNavigationWorks("/nodes/localhost", page);
  await expectUrlPersistsReload(page);

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/nodes/localhost");
});

test.describe("repo page navigation", () => {
  test("navigation between commit history and single commit", async ({
    page,
  }) => {
    const repoHistoryURL = `${sourceBrowsingUrl}/history/${aliceMainHead}`;
    await page.goto(repoHistoryURL);

    await page
      .getByRole("link", {
        name: "Verify that crate::DoubleColon::should_work()",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      `${sourceBrowsingUrl}/commits/${aliceMainHead}`,
    );

    await expectBackAndForwardNavigationWorks(repoHistoryURL, page);
    await expectUrlPersistsReload(page);
  });

  test("navigate between tree and commit history", async ({ page }) => {
    const repoTreeURL = `${sourceBrowsingUrl}/tree/${aliceMainHead}`;

    await page.goto(repoTreeURL);
    await page
      .getByRole("progressbar", { name: "Page loading" })
      .waitFor({ state: "hidden" });
    await expect(page).toHaveURL(repoTreeURL);

    await page
      .getByRole("link", { name: `Commits ${aliceMainCommitCount}` })
      .click();

    await expect(page).toHaveURL(
      `${sourceBrowsingUrl}/history/${aliceMainHead}`,
    );

    await expectBackAndForwardNavigationWorks(repoTreeURL, page);
    await expectUrlPersistsReload(page);
  });

  test("navigate between tree and commit history while a file is selected", async ({
    page,
  }) => {
    const repoTreeURL = `${sourceBrowsingUrl}`;

    await page.goto(repoTreeURL);
    await page
      .getByRole("progressbar", { name: "Page loading" })
      .waitFor({ state: "hidden" });
    await expect(page).toHaveURL(repoTreeURL);

    await page.getByText(".hidden").click();
    await expect(page).toHaveURL(`${repoTreeURL}/tree/.hidden`);

    await page
      .getByRole("link", { name: `Commits ${aliceMainCommitCount}` })
      .click();
    await expect(page).toHaveURL(`${sourceBrowsingUrl}/history`);
  });

  test("navigate repo paths", async ({ page }) => {
    const repoTreeURL = `${sourceBrowsingUrl}/tree/${aliceMainHead}`;

    await page.goto(repoTreeURL);
    await expect(page).toHaveURL(repoTreeURL);

    await page.getByText(".hidden").click();
    await expect(page).toHaveURL(`${repoTreeURL}/.hidden`);

    await page.getByText("bin").click();
    await page.getByText("true").click();
    await expect(page).toHaveURL(`${repoTreeURL}/bin/true`);

    await expectBackAndForwardNavigationWorks(`${repoTreeURL}/.hidden`, page);
    await expectUrlPersistsReload(page);
  });

  test("page title", async ({ page }) => {
    await page.goto(sourceBrowsingUrl, {
      waitUntil: "networkidle",
    });
    const title = await page.title();
    expect(title).toBe(
      "source-browsing · Git repository for source browsing tests",
    );
  });

  test("page title on repo with empty description", async ({ page, peer }) => {
    const { rid } = await createRepo(peer, {
      name: "RepoWithNoDescription",
    });
    await page.goto(peer.ridUrl(rid), {
      waitUntil: "networkidle",
    });
    const title = await page.title();
    expect(title).toBe("RepoWithNoDescription");
  });

  test("navigate repo paths with an explicitly selected peer", async ({
    page,
  }) => {
    // If a branch isn't explicitly specified, the code assumes the repo
    // default branch is selected. We omit showing the default branch in the URL.

    const repoTreeURL = `${sourceBrowsingUrl}/remotes/${aliceRemote.substring(
      8,
    )}`;

    await page.goto(repoTreeURL);
    await expect(page).toHaveURL(repoTreeURL);

    await page.getByText(".hidden").click();
    await expect(page).toHaveURL(`${repoTreeURL}/tree/.hidden`);

    await page.getByText("bin").click();
    await page.getByText("true").click();
    await expect(page).toHaveURL(`${repoTreeURL}/tree/bin/true`);

    await expectBackAndForwardNavigationWorks(
      `${repoTreeURL}/tree/.hidden`,
      page,
    );
    await expectUrlPersistsReload(page);
  });

  test("navigate repo paths with an explicitly selected peer and branch", async ({
    page,
  }) => {
    const repoTreeURL = `${sourceBrowsingUrl}/remotes/${aliceRemote.substring(
      8,
    )}/tree/main`;

    await page.goto(repoTreeURL);
    await expect(page).toHaveURL(repoTreeURL);

    await page.getByText(".hidden").click();
    await expect(page).toHaveURL(`${repoTreeURL}/.hidden`);

    await page.getByText("bin").click();
    await page.getByText("true").click();
    await expect(page).toHaveURL(`${repoTreeURL}/bin/true`);

    await expectBackAndForwardNavigationWorks(`${repoTreeURL}/.hidden`, page);
    await expectUrlPersistsReload(page);
  });
});

test.describe("deep links", () => {
  test("trailing slash is tolerated on repo URLs", async ({ page }) => {
    await page.goto(`${sourceBrowsingUrl}/`);
    await expect(page.getByText(".hidden")).toBeVisible();
    await expect(page).toHaveURL(sourceBrowsingUrl);
  });

  test("unknown top-level path renders not found", async ({ page }) => {
    await page.goto("/foo/baz/bar");
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("unknown repo sub-path renders not found", async ({ page }) => {
    await page.goto(`${sourceBrowsingUrl}/nope`);
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("deep link to patch changes tab", async ({ page }) => {
    await page.goto(`${cobUrl}/patches`);
    await page
      .getByRole("link", { name: "Taking another stab at the README" })
      .click();
    await page.waitForURL(/patches\/[a-f0-9]{40}$/);
    const patchUrl = page.url();

    await page.goto(`${patchUrl}?tab=changes`);
    await expect(
      page.getByRole("cell", { name: "Had to push a new revision" }),
    ).toBeVisible();
  });

  test("deep link to patch diff comparison", async ({ page }) => {
    await page.goto(`${cobUrl}/patches`);
    await page
      .getByRole("link", { name: "Taking another stab at the README" })
      .click();
    await page.waitForURL(/patches\/[a-f0-9]{40}$/);
    const patchUrl = page.url();

    await page.goto(
      `${patchUrl}?diff=38c225e2a0b47ba59def211f4e4825c31d9463ec..9e4feab1b2123dfa5f22bd0e4656060ec9296638`,
    );
    await expect(
      page.getByRole("button", { name: "Compare 38c225..9e4fea" }),
    ).toBeVisible();
  });

  test("deep link to closed issues", async ({ page }) => {
    await page.goto(`${cobUrl}/issues?status=closed`);
    await expect(page.getByText("A solved issue")).toBeVisible();
  });

  test("deep link to a file with special characters in its name", async ({
    page,
    peer,
  }) => {
    const { rid, repoFolder } = await createRepo(peer, {
      name: "special-chars",
    });
    await Fs.writeFile(
      Path.join(repoFolder, "with#hash%percent.md"),
      "special characters content",
    );
    await peer.git(["add", "."], { cwd: repoFolder });
    await peer.git(["commit", "-m", "Add file with special characters"], {
      cwd: repoFolder,
    });
    await peer.git(["push", "rad"], { cwd: repoFolder });

    const blobUrl = `${peer.ridUrl(rid)}/tree/main/with%23hash%25percent.md`;
    await page.goto(blobUrl);
    await expect(page.getByText("special characters content")).toBeVisible();
    await expect(page).toHaveURL(blobUrl);

    const seedsBlobUrl = blobUrl.replace("/nodes/", "/seeds/");
    await page.goto(seedsBlobUrl);
    await expect(page).toHaveURL(blobUrl);
    await expect(page.getByText("special characters content")).toBeVisible();
  });

  test("legacy /seeds URLs redirect to /nodes", async ({ page }) => {
    await page.goto(sourceBrowsingUrl.replace("/nodes/", "/seeds/"));
    await expect(page).toHaveURL(sourceBrowsingUrl);
    await expect(page.getByText(".hidden")).toBeVisible();
  });
});
