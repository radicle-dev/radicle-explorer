import type { Plugin } from "vite";

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function packageDir(name: string): string {
  return path.dirname(require.resolve(`${name}/package.json`));
}

function packageVersion(name: string): string {
  const { version } = require(`${name}/package.json`) as { version: string };
  return version;
}

// index.html loads /katex.min.css, so the stylesheet and the fonts it
// references must be in the public directory.
async function copyKatexAssets(publicDir: string) {
  const dist = path.join(packageDir("katex"), "dist");

  await fs.copyFile(
    path.join(dist, "katex.min.css"),
    path.join(publicDir, "katex.min.css"),
  );
  await fs.cp(path.join(dist, "fonts"), path.join(publicDir, "fonts"), {
    recursive: true,
  });
}

// Emoji URLs are built at runtime, so the SVGs cannot be bundled and must be
// in the public directory. The version stamp skips the copy of ~3700 files
// when the assets are already installed.
async function copyTwemojiAssets(publicDir: string) {
  const version = packageVersion("@twemoji/svg");
  const target = path.join(publicDir, "twemoji");
  const stamp = path.join(target, ".version");

  const installed = await fs.readFile(stamp, "utf8").catch(() => undefined);
  if (installed === version) {
    return;
  }

  const source = packageDir("@twemoji/svg");
  await fs.cp(source, target, {
    recursive: true,
    // The package also holds a readme, a license and package.json.
    filter: entry => entry === source || entry.endsWith(".svg"),
  });
  await fs.writeFile(stamp, version);
}

export function assets(): Plugin {
  return {
    name: "assets",
    // Vitest loads this config too, but does not need the assets.
    apply: () => !process.env.VITEST,
    // The dev server reads the public directory right after the config is
    // resolved, so the assets have to be in place before that.
    async configResolved(config) {
      await copyKatexAssets(config.publicDir);
      await copyTwemojiAssets(config.publicDir);
    },
  };
}
