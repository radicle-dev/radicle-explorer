import type { Page } from "@playwright/test";
import type { RadiclePeer } from "@tests/support/peerManager";

import * as Fs from "node:fs/promises";
import * as Path from "node:path";

export async function changeBranch(peer: string, branch: string, page: Page) {
  await page.locator('[title="Change branch"]:visible').first().click();
  const peerLocator = page.getByLabel("peer-item").filter({ hasText: peer });

  const branchButton = page.getByRole("button", { name: branch });
  const isVisible = await branchButton.isVisible().catch(() => false);

  if (!isVisible) {
    await peerLocator.getByTitle("Expand peer").click();
  }

  await branchButton.click();
}

// Create a repo using the rad CLI.
export async function createRepo(
  peer: RadiclePeer,
  {
    name,
    description = "",
    defaultBranch = "main",
    visibility = "public",
  }: {
    name: string;
    description?: string;
    defaultBranch?: string;
    visibility?: "public" | "private";
  },
): Promise<{ rid: string; repoFolder: string; defaultBranch: string }> {
  const repoFolder = Path.join(peer.checkoutPath, name);

  await peer.git(["init", name, "--initial-branch", defaultBranch], {
    cwd: peer.checkoutPath,
  });
  await peer.git(["commit", "--allow-empty", "--message", "initial commit"], {
    cwd: repoFolder,
  });
  await peer.rad(
    [
      "init",
      "--name",
      name,
      "--default-branch",
      defaultBranch,
      "--description",
      description,
      `--${visibility}`,
    ],
    {
      cwd: repoFolder,
    },
  );

  const { stdout: rid } = await peer.rad(["inspect"], {
    cwd: repoFolder,
  });

  return { rid, repoFolder, defaultBranch };
}

// Run a rad-artifact command without prompts or network announcements.
export function radArtifact(
  peer: RadiclePeer,
  repoFolder: string,
  args: string[],
) {
  return peer.spawn("rad-artifact", ["--no-announce", "--no-input", ...args], {
    cwd: repoFolder,
  });
}

// Write a file and register it as a release artifact. The CID is computed from
// the file contents, so the file has to exist before registering. The release
// is created when `release` is not given.
export async function registerArtifact(
  peer: RadiclePeer,
  repoFolder: string,
  {
    name,
    content = `${name}\n`,
    revision = "HEAD",
    release,
  }: {
    name: string;
    content?: string;
    revision?: string;
    release?: string;
  },
): Promise<{ releaseId: string; cid: string }> {
  const artifactPath = Path.join(repoFolder, name);
  await Fs.writeFile(artifactPath, content);

  const { stdout } = await radArtifact(peer, repoFolder, [
    "register",
    artifactPath,
    ...(release ? ["--release", release] : ["--revision", revision]),
    "--name",
    name,
    "--json",
  ]);

  return JSON.parse(stdout);
}

export function extractPatchId(cmdOutput: { stderr: string }) {
  const match = cmdOutput.stderr.match(/[0-9a-f]{40}/);
  if (match) {
    return match[0];
  } else {
    throw new Error("Could not get patch id");
  }
}
