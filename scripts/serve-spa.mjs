// Serves the static production bundle in `build/` with an SPA fallback to
// `index.html`, reading from disk on every request. This mirrors production
// hosting (static assets + single-page-application fallback) and, unlike
// SvelteKit's `vite preview`, doesn't cache the app shell at startup — the
// e2e setup rebuilds the bundle after this server has already been started.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex === -1 ? 4173 : Number(args[portIndex + 1]);

const root = "build";
const mimeTypes = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
  } catch {
    res.writeHead(400, { "content-type": "text/plain" });
    res.end("Bad request");
    return;
  }
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, safePath);

  let data;
  try {
    data = await readFile(file);
  } catch {
    try {
      file = join(root, "index.html");
      data = await readFile(file);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
      return;
    }
  }

  res.writeHead(200, {
    "content-type": mimeTypes[extname(file)] ?? "application/octet-stream",
  });
  res.end(data);
}).listen(port, () => {
  console.log(`Serving ${root}/ at http://localhost:${port}`);
});
