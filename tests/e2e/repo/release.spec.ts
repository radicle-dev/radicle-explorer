import { test, expect } from "@tests/support/fixtures.js";
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

test("navigate single release", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "single-release",
  });
  const { releaseId } = await registerArtifact(peer, repoFolder, {
    name: "binary",
  });

  await page.goto(`${peer.uiUrl()}/${rid}/releases`);
  await page.locator(".release-teaser").getByText("initial commit").click();

  await expect(page).toHaveURL(`${peer.uiUrl()}/${rid}/releases/${releaseId}`);
  await expect(page.getByText("binary")).toBeVisible();
});

test("release title and tag name come from the tag", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "tagged-release",
  });
  await peer.git(["tag", "--annotate", "v1.0", "--message", "Version 1.0"], {
    cwd: repoFolder,
  });
  // rad-artifact resolves revisions in Radicle storage, where refs are
  // namespaced per node, so push the tag and address it by object id.
  await peer.git(["push", "rad", "--tags"], { cwd: repoFolder });
  const { stdout: tagOid } = await peer.git(["rev-parse", "v1.0"], {
    cwd: repoFolder,
  });
  const { releaseId } = await registerArtifact(peer, repoFolder, {
    name: "binary",
    revision: tagOid,
  });

  await page.goto(`${peer.uiUrl()}/${rid}/releases/${releaseId}`);
  await expect(page.getByText("Version 1.0")).toBeVisible();
  await expect(page.getByText("v1.0")).toBeVisible();
});

test("artifact download locations", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "release-locations",
  });

  // An artifact with a web location is downloadable straight from the browser.
  const { releaseId, cid } = await registerArtifact(peer, repoFolder, {
    name: "web-artifact",
  });
  await radArtifact(peer, repoFolder, [
    "location",
    "add",
    "--release",
    releaseId,
    "--cid",
    cid,
    "https://example.com/web-artifact",
  ]);

  // An artifact served over the radicle-artifact protocol needs the CLI.
  const { cid: cliCid } = await registerArtifact(peer, repoFolder, {
    name: "cli-artifact",
    release: releaseId,
  });
  await radArtifact(peer, repoFolder, [
    "location",
    "add",
    "--release",
    releaseId,
    "--cid",
    cliCid,
    // A bare radiroh location matches any seeding endpoint.
    "radiroh://",
  ]);

  // An artifact without any location can't be fetched at all.
  await registerArtifact(peer, repoFolder, {
    name: "unavailable-artifact",
    release: releaseId,
  });

  await page.goto(`${peer.uiUrl()}/${rid}/releases/${releaseId}`);
  await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute(
    "href",
    "https://example.com/web-artifact",
  );
  await expect(
    page.getByRole("button", { name: "Copy CLI command" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Unavailable" })).toBeVisible();
});

test("show redacted artifacts", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "redacted-artifact",
  });
  const { releaseId } = await registerArtifact(peer, repoFolder, {
    name: "good-artifact",
  });
  const { cid } = await registerArtifact(peer, repoFolder, {
    name: "flagged-artifact",
    release: releaseId,
  });
  await radArtifact(peer, repoFolder, [
    "redact",
    "--release",
    releaseId,
    "--cid",
    cid,
    "--reason",
    "Built from the wrong toolchain",
  ]);

  await page.goto(`${peer.uiUrl()}/${rid}/releases/${releaseId}`);
  await expect(page.getByText("good-artifact")).toBeVisible();
  await expect(page.getByText("flagged-artifact")).toBeHidden();

  await page.getByRole("button", { name: "Show redacted 1" }).click();
  await expect(page.getByText("flagged-artifact")).toBeVisible();
  await expect(page.getByText("Built from the wrong toolchain")).toBeVisible();
});

test("filter artifacts by author", async ({ page, peer }) => {
  test.skip(!useLocalHttpd, releaseApiOnlyLocal);

  const { rid, repoFolder } = await createRepo(peer, {
    name: "artifact-authors",
  });
  const { releaseId } = await registerArtifact(peer, repoFolder, {
    name: "binary",
  });

  await page.goto(`${peer.uiUrl()}/${rid}/releases/${releaseId}`);
  await page.getByRole("link", { name: "All 1" }).click();
  await expect(page).toHaveURL(
    `${peer.uiUrl()}/${rid}/releases/${releaseId}?allAuthors=true`,
  );

  await page.getByRole("link", { name: "Delegates 1" }).click();
  await expect(page).toHaveURL(`${peer.uiUrl()}/${rid}/releases/${releaseId}`);
});
