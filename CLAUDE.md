# radicle-explorer

Svelte web app for browsing Radicle repositories with a TypeScript HTTP
client (`http-client/`) and a Rust backend (`radicle-httpd/`).

## Plan mode

- Propose the minimal MVP first — no tests, no docs, no speculative extras
- Tests are added only when explicitly requested after MVP review
- Keep plans concise: short bullet points listing what changes and where
- Skip obvious details and boilerplate explanations

## Tech stack

- Svelte 5 with legacy syntax (`$:`, stores, `export let`)
- TypeScript, Vite, Vitest, Playwright
- Rust backend: `radicle-httpd/`
- Path aliases: `@app` (src), `@http-client`, `@public`, `@tests`

## Commands

### Checks and linting (tsc, svelte-check, eslint, prettier)

```sh
npm run check
npm run format          # auto-fix prettier issues
```

### Unit tests

```sh
npm run test:unit
npm run test:http-client:unit
```

### E2E tests

```sh
npm run test:e2e -- --project chromium
npm run test:e2e -- tests/e2e/<file>.spec.ts --project chromium
```

`SKIP_SETUP=true` skips fixture creation for faster iteration.
Only use it when you are solely editing `.spec.ts` files and fixtures
already exist from a previous full run. Any change to app code, httpd,
or test fixtures requires a full run.

```sh
SKIP_SETUP=true npm run test:e2e -- --project chromium
```

### Rust backend (radicle-httpd)

```sh
cd radicle-httpd && cargo clippy --all --tests
cd radicle-httpd && cargo fmt --all --check
cd radicle-httpd && cargo test --all-features
```

E2E and http-client tests run against a stable pre-built httpd by
default. When changing `radicle-httpd/`, also test against the local
build and run both to verify backwards compatibility:

```sh
npm run test:e2e:local -- --project chromium
npm run test:http-client:unit:local
```

### API changes across layers

Adding or changing an API endpoint typically touches three layers:
1. `radicle-httpd/` — Rust handler (add route, types, logic)
2. `http-client/` — TypeScript client (add fetch function, types)
3. `src/` — Svelte UI (consume the new data)

**Backwards compatibility:** Only add to the backend API — never rename
or remove fields/endpoints unless explicitly deprecating. The frontend
must handle older nodes gracefully: treat new API fields as optional
and fall back when they're absent.

### Pre-push checklist

1. `npm run check`
2. `npm run test:unit`
3. `npm run test:http-client:unit`
4. `npm run test:e2e -- --project chromium`
5. If Rust code changed: clippy, fmt, cargo test (see above),
   plus `:local` variants of e2e and http-client tests

## Radicle ecosystem (sibling repos)

`radicle-httpd` depends on crates from sibling repositories. Read
source from these paths when working on Rust code.

### heartwood (`../heartwood`)

Core Radicle protocol implementation. Key crates used by httpd:
- `radicle` — standard library (storage, identity, COBs, git, node)
- `radicle-cob` — collaborative objects (issues, patches as CRDTs)
- `radicle-crypto` — Ed25519 signing, SSH key handling
- `radicle-core` — fundamental types (`RepoId`, etc.)

Key files:
- `../heartwood/HACKING.md` — development guide, environment variables
- `../heartwood/ARCHITECTURE.md` — high-level architecture
- `../heartwood/crates/radicle/src/lib.rs` — main library entry point

### radicle-git (`../radicle-git`)

Git library wrappers. Key crate:
- `radicle-surf` — code browsing (files, diffs, commits, branches,
  tags). This is what httpd uses to serve repository content.

Key file: `../radicle-git/radicle-surf/src/lib.rs`

### radicle-job (`../radicle-job`)

Decentralized job execution (CI/CD) on the Radicle network.
Key file: `../radicle-job/README.md`

### RIPs — protocol specs (`../rips`)

- `../rips/0001-heartwood.md` — protocol overview
- `../rips/0002-identity.md` — identity system (DIDs, Ed25519)
- `../rips/0003-storage-layout.md` — git storage layout

### Radicle documentation (`../radicle.dev`)

Read these when you need domain context for UI work:
- `../radicle.dev/_guides/user.md` — end-to-end user workflows
  (init, clone, seed, issues, patches, code review, private repos)
- `../radicle.dev/_guides/protocol.md` — protocol internals
  (gossip, replication, identity documents, COB data model, trust)
- `../radicle.dev/_guides/seeder.md` — seed node operation
  (seeding policies, httpd setup, DNS-SD)
- `../radicle.dev/_posts/2025-07-23-using-radicle-ci-for-development.md` — CI integration
- `../radicle.dev/_posts/2025-08-12-canonical-references.md` — canonical refs design

## Domain glossary

- **RID** — Repository ID (`rad:z3gqc...`)
- **DID** — Decentralized Identifier, user identity (`did:key:z6Mk...`)
- **NID** — Node ID, public key suffix of a DID
- **COB** — Collaborative Object (issue, patch, or identity as a Git DAG)
- **Delegate** — authorized repo maintainer; signatures determine canonical state
- **Patch** — pull-request equivalent with immutable revisions and reviews
- **Seed** — hosting/replicating a repo; seed nodes are always-on servers
- **Canonical refs** — branches/tags resolved by delegate quorum

## Code conventions

- Prefer `undefined` over `null`
- Do not add comments unless explicitly asked. When writing comments,
  use proper English sentences
- Ask before adding new dependencies

### Svelte components

- Script order (enforced by prettier): `<script context="module">`,
  `<script lang="ts">`, `<style>`, markup
- Optional props use `export let foo: T = undefined`, not `?:`
- CSS: scoped styles with design tokens (`var(--color-text-primary)`,
  `var(--txt-body-m-regular)`, `var(--border-radius-sm)`); use `:global()`
  for styling slotted or `{@html}` content
- Loading states: `{#await promise}` blocks for inline async;
  local `loading` boolean with `try/catch` for imperative fetches

### TypeScript / HTTP client

- Derive types from Zod schemas (`z.infer<typeof fooSchema>`), never
  hand-write interfaces that duplicate a schema
- Schema naming: `fooSchema` (camelCase + Schema suffix) → type `Foo`
- Use ES private fields (`#field`), not the TypeScript `private` keyword
- API timestamps are in seconds; multiply by 1000 for JS `Date`
- Relative imports inside `http-client/` use `.js` extension (ESM)

### Rust backend (radicle-httpd)

- Each route module exposes `pub fn router(ctx: Context) -> Router`;
  handlers are private `async fn`s
- Handler signature:
  `async fn handler(State(ctx): State<Context>, Path(rid): Path<RepoId>) -> impl IntoResponse`
- Annotate the error type on Ok: `Ok::<_, Error>(Json(data))`
- All response structs: `#[serde(rename_all = "camelCase")]`
- Optional fields: `#[serde(skip_serializing_if = "Option::is_none")]`
- Use `json!()` macro for inline JSON; `immutable_response()` /
  `cached_response()` helpers for Cache-Control headers
- Module structure: `api/v1/` handlers, `api/json/` serialization helpers,
  `api/query.rs` query param types, `api/error.rs` error types

## Commit messages

- Imperative mood: "Add feature" not "Added feature"
- Capitalize subject, no trailing period, max 50 chars

## Do NOT

- Do not use `npm test` — no default test script exists
- Do not use `yarn` or `pnpm` — use npm
- Do not use `npx vitest` or `npx playwright test` — use the `npm run` scripts
- Do not use Svelte 5 runes (`$state`, `$derived`, `$props`) — codebase uses legacy Svelte syntax
