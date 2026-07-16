import * as Fs from "node:fs/promises";
import * as Path from "node:path";

import { test, expect } from "@tests/support/fixtures.js";
import { createRepo } from "@tests/support/repo.js";
import { useLocalHttpd } from "@tests/support/support.js";

test("browse releases and open a release", async ({ page, peer }) => {
  test.skip(
    !useLocalHttpd,
    "the release read API only exists in the local httpd build",
  );

  const { rid, repoFolder } = await createRepo(peer, { name: "releases" });
  const { stdout: head } = await peer.git(["rev-parse", "HEAD"], {
    cwd: repoFolder,
  });

  // Register an artifact from a local file so the CID is computed for us.
  const artifactPath = Path.join(repoFolder, "artifact.bin");
  await Fs.writeFile(artifactPath, "hello release\n");

  const { stdout: receipt } = await peer.spawn(
    "rad-artifact",
    ["--no-announce", "--no-input", "create", head, "--json"],
    { cwd: repoFolder },
  );
  const { releaseId } = JSON.parse(receipt);
  await peer.spawn(
    "rad-artifact",
    [
      "--no-announce",
      "--no-input",
      "register",
      artifactPath,
      "--release",
      releaseId,
      "--name",
      "binary",
    ],
    { cwd: repoFolder },
  );

  await page.goto(`${peer.uiUrl()}/${rid}/releases`);
  await page.waitForLoadState("networkidle");

  // The teaser shows the release title, resolved from the commit summary.
  const teaser = page.getByText("initial commit");
  await expect(teaser).toBeVisible();

  // Opening it navigates to the release page, which lists the artifact.
  await teaser.click();
  await expect(page).toHaveURL(`${peer.uiUrl()}/${rid}/releases/${releaseId}`);
  await expect(page.getByText("binary")).toBeVisible();
});
