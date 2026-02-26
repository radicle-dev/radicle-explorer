import * as Fs from "node:fs";
import * as Path from "node:path";
import {
  assertBinariesInstalled,
  heartwoodRelease,
  radicleHttpdRelease,
  removeWorkspace,
  tmpDir,
} from "@tests/support/support.js";
import {
  defaultConfig,
  createCobsFixture,
  createCommitsFixture,
  createMarkdownFixture,
  createSourceBrowsingFixture,
  gitOptions,
} from "@tests/support/fixtures.js";
import config from "@tests/support/config.js";
import { createPeerManager } from "@tests/support/peerManager.js";

const heartwoodBinaryPath = Path.join(
  tmpDir,
  "bin",
  "heartwood",
  heartwoodRelease,
).trim();
const httpdBinaryPath = Path.join(
  tmpDir,
  "bin",
  "httpd",
  radicleHttpdRelease,
).trim();

process.env.PATH = [
  heartwoodBinaryPath,
  httpdBinaryPath,
  process.env.PATH,
].join(Path.delimiter);

export default async function globalSetup(): Promise<() => void> {
  try {
    await assertBinariesInstalled("rad", heartwoodRelease, heartwoodBinaryPath);
    await assertBinariesInstalled(
      "radicle-httpd",
      radicleHttpdRelease,
      httpdBinaryPath,
    );
  } catch (error) {
    console.error(error);
    console.log("");
    console.log("To download the required test binaries, run:");
    console.log(" 👉 ./scripts/install-binaries");
    console.log("");
    process.exit(1);
  }

  if (!process.env.SKIP_BUILD) {
    // Build the app once before running tests to avoid compilation
    // overhead on each worker.
    console.log("Building the app for tests...");
    const { execa: exec } = await import("execa");
    await exec("npm", ["run", "build"], { stdio: "inherit" });
    console.log("Build complete");
  } else {
    console.log("Skipping build. Set SKIP_BUILD to skip this");
  }

  if (!process.env.SKIP_FIXTURE_CREATION) {
    console.log(
      "Recreating static fixtures. Set SKIP_FIXTURE_CREATION to skip this",
    );
    await removeWorkspace();
  }

  const peerManager = await createPeerManager({
    dataDir: Path.resolve(tmpDir, "peers"),
    outputLog: Fs.createWriteStream(
      Path.resolve(tmpDir, "globalPeerManager.log"),
    )
      // Workaround for fixing MaxListenersExceededWarning.
      // Since every prefixOutput stream adds stream listeners that don't autoClose.
      // TODO: We still seem to have some descriptors left open when running vitest, which we should handle.
      .setMaxListeners(16),
  });

  const palm = await peerManager.createPeer({
    name: "palm",
    gitOptions: gitOptions["alice"],
  });

  if (!process.env.SKIP_FIXTURE_CREATION) {
    await palm.startNode({
      web: {
        pinned: {
          repositories: ["rad:z4BwwjPCFNVP27FwVbDFgwVwkjcir"],
        },
        description: `:seedling: Radicle is an open source, peer-to-peer code collaboration stack built on Git.

:construction: [radicle.xyz](https://radicle.xyz)`,
      },
      node: {
        ...defaultConfig.node,
        seedingPolicy: { default: "allow", scope: "all" },
        alias: "palm",
      },
    });
    await palm.startHttpd(config.nodes.defaultHttpdPort);

    try {
      console.log("Creating source-browsing fixture");
      await createSourceBrowsingFixture(peerManager, palm);
      console.log("Creating markdown fixture");
      await createMarkdownFixture(palm);
      console.log("Creating cobs fixture");
      await createCobsFixture(peerManager, palm);
      console.log("Creating commits fixture");
      await createCommitsFixture(palm);
      console.log("All fixtures created");
    } catch (error) {
      console.log("");
      console.log("Not able to create the required fixtures.");
      console.log("Make sure you are not using binaries compiled for release.");
      console.log("");
      console.log(error);
      console.log("");
      process.exit(1);
    }
    await palm.stopNode();
  } else {
    await palm.startHttpd(config.nodes.defaultHttpdPort);
  }

  return async () => {
    await peerManager.shutdown();
  };
}
