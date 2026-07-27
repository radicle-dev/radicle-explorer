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

See the `radicle-ecosystem` skill for the map of sibling repositories
(heartwood, radicle-git, radicle-job, rips, radicle.dev) and the key
crates and files in each.

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

## Commit messages

- Imperative mood: "Add feature" not "Added feature"
- Capitalize subject, no trailing period, max 50 chars

## Do NOT

- Do not use `npm test` — no default test script exists
- Do not use `yarn` or `pnpm` — use npm
- Do not use `npx vitest` or `npx playwright test` — use the `npm run` scripts
- Do not use Svelte 5 runes (`$state`, `$derived`, `$props`) — codebase uses legacy Svelte syntax
