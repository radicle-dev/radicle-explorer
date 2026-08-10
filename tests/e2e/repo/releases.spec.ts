import { test, cobUrl, expect } from "@tests/support/fixtures.js";
import {
  createRepo,
  radArtifact,
  registerArtifact,
} from "@tests/support/repo.js";
import { useLocalHttpd } from "@tests/support/support.js";

const releaseApiOnlyLocal =
  "the release read API only exists in the local httpd build";

// Release fixtures need several rad-artifact commands, which takes longer than
// the default per-test budget.
test.describe.configure({ timeout: 30_000 });

test("navigate release listing", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "release-listing",
  });
  await registerArtifact(peer, repoFolder, { name: "binary" });

  await page.goto(`${peer.uiUrl()}/${rid}`);
  await page.getByRole("link", { name: "Releases 1" }).click();
  await expect(page).toHaveURL(`${peer.uiUrl()}/${rid}/releases`);

  // The release COB has no title; it falls back to the commit summary.
  await expect(
    page.locator(".release-teaser").getByText("initial commit"),
  ).toBeVisible();
});

test("filter releases by author", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "release-authors",
  });
  await registerArtifact(peer, repoFolder, { name: "binary" });

  await page.goto(`${peer.uiUrl()}/${rid}/releases`);
  await page.getByRole("link", { name: "All 1" }).click();
  await expect(page).toHaveURL(
    `${peer.uiUrl()}/${rid}/releases?allAuthors=true`,
  );

  await page.getByRole("link", { name: "Delegates 1" }).click();
  await expect(page).toHaveURL(`${peer.uiUrl()}/${rid}/releases`);
});

test("empty release listing", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid } = await createRepo(peer, { name: "no-releases" });

  await page.goto(`${peer.uiUrl()}/${rid}/releases`);
  await expect(page.getByText("No releases")).toBeVisible();
});

test("hide fully redacted releases", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "redacted-release",
  });
  const { releaseId, cid } = await registerArtifact(peer, repoFolder, {
    name: "binary",
  });
  await radArtifact(peer, repoFolder, [
    "redact",
    "--release",
    releaseId,
    "--cid",
    cid,
    "--reason",
    "Compromised build",
  ]);

  await page.goto(`${peer.uiUrl()}/${rid}/releases`);
  await expect(page.getByText("No releases")).toBeVisible();

  // The tab counter comes from the repo metadata, which counts every release
  // COB, redacted or not.
  await expect(page.getByRole("button", { name: "Releases 1" })).toBeVisible();
});

test("releases are unavailable on older nodes", async ({ page }) => {
  test.skip(useLocalHttpd, "older nodes are the pre-built httpd release");

  await page.goto(cobUrl);
  await expect(page.getByRole("button", { name: /^Releases/ })).toBeHidden();

  await page.goto(`${cobUrl}/releases`);
  await expect(
    page.getByText("Releases are not available on this node"),
  ).toBeVisible();
});
