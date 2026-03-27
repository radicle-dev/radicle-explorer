# OG Image Generation

Two components work together to serve Open Graph preview images for
social media embeds (Twitter/X, Slack, Discord, etc.).

## Components

**og-injector** (`og-injector.js`) runs as middleware on the app itself
(Cloudflare Workers). It injects `<meta og:image>`, `<meta og:title>`,
and related Open Graph tags into every HTML response, pointing to the
OG image worker.

**open-graph** (`open-graph/index.js`) is a standalone Cloudflare
Worker that generates PNG cards on the fly using Satori (HTML/CSS to
SVG) and resvg-wasm (SVG to PNG). It fetches data from the radicle-httpd
API, generates procedural avatars, and caches results at the edge.

Request flow: request hits app -> og-injector injects og:image URL ->
social crawler fetches image from open-graph worker -> worker calls
httpd API, renders PNG, caches and returns it.

## Routes

| URL pattern | Card type |
|-------------|-----------|
| `/` | Home (forest image + wordmark) |
| `/nodes/:host` | Node (avatar + hostname + stats) |
| `/nodes/:host/users/:did` | User (avatar + alias + DID) |
| `/nodes/:host/:rid` | Repository (avatar + name + stats + delegates) |
| `/nodes/:host/:rid/issues` | Issues listing (open + closed counts) |
| `/nodes/:host/:rid/patches` | Patches listing (open/draft/archived/merged counts) |
| `/nodes/:host/:rid/history` | Commit history (branch + commit count) |
| `/nodes/:host/:rid/remotes/:peer/history/:branch?` | Commit history (peer branch) |
| `/nodes/:host/:rid/issues/:id` | Single issue (state pill + title + author) |
| `/nodes/:host/:rid/patches/:id` | Single patch (state pill + title + author) |
| `/nodes/:host/:rid/commits/:sha` | Single commit (title + author/committer gravatars) |

## Fallback chain

When data fetching fails, cards degrade gracefully:

    single issue/patch/commit -> repo card -> node card
    issues/patches/history listing -> repo card -> node card
    repo card -> node card
    node/user/home -> always renders

## Fonts

Two weights of Booton are bundled as worker data assets:
- `Booton-Regular.ttf` (400) for body text
- `Booton-SemiBold.ttf` (600) for headings and labels

## Caching

Two layers of caching:

- **open-graph worker**: Uses Cloudflare's Cache API (`caches.default`)
  at the edge. Responses carry `Cache-Control: public, max-age=120`
  (2 minutes).
- **og-injector**: Injected HTML responses carry
  `Cache-Control: public, max-age=300` (5 minutes).

## Deployment

### og-injector

Deployed as part of the Cloudflare Pages project via `npm run deploy`.
The `OG_IMAGE_BASE` env var is set to the open-graph worker origin
(`https://open-graph.radicle.network`).

### open-graph worker

```sh
npm run deploy:open-graph
```

For local development:

```sh
npm run start:open-graph
```

The worker bundles fonts (`.ttf`), the forest image (`.jpg`), and the
resvg WASM module as data assets configured in `wrangler.toml`.
