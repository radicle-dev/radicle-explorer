# Workspace Restructure & Search Feature Flag

**Date:** 2026-06-03
**Status:** Approved
**Layers on:** `lkqrqzox::syxuksnx` (radicle-search introduction series)

## Summary

Restructure radicle-explorer's Rust crates into a Cargo workspace under a
`crates/` directory, and gate radicle-httpd's search integration behind a
compile-time feature flag. This makes dependency management explicit, moves all
Meilisearch protocol logic into radicle-search, and gives operators a
build-time choice about search support.

## Design Decisions

### 1. Cargo Workspace with `crates/` Directory

Move `radicle-httpd/` and `radicle-search/` into `crates/`:

```
crates/
  radicle-httpd/
  radicle-search/
Cargo.toml          ← workspace root
Cargo.lock          ← single unified lockfile
rust-toolchain      ← shared, moved from radicle-httpd/
```

**Root `Cargo.toml`:**

```toml
[workspace]
members = ["crates/*"]
resolver = "2"

[workspace.package]
license = "MIT OR Apache-2.0"
homepage = "https://radicle.dev"

[workspace.dependencies]
anyhow = "1"
chrono = { version = "0.4.41", default-features = false, features = ["clock"] }
lexopt = "0.3.1"
meilisearch-sdk = "0.33.0"
radicle = "0.24.0"
radicle-surf = { version = "0.27.1", default-features = false }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
tokio = { version = "1.47.1", default-features = false }
tracing = { version = "0.1.41", default-features = false, features = ["std", "log"] }
tracing-subscriber = { version = "0.3.19", default-features = false, features = ["std", "ansi", "fmt"] }
```

Each crate replaces duplicated values with workspace references
(`anyhow.workspace = true`, `license.workspace = true`, etc.), adding
crate-specific features where needed (e.g. httpd adds `features = ["serde"]`
to `radicle-surf`).

`edition` stays per-crate (httpd = 2021, search = 2024). `version` stays
per-crate (0.25.0 vs 0.1.0).

**`rust-toolchain`** at repo root: `1.94.0` (bump to `1.95.0` after these
changes are submitted upstream).

**Rationale:** 373 of radicle-search's 351 transitive crates overlap with
radicle-httpd. A workspace unifies the lockfile, shares the `target/`
directory, and prevents dep version drift.

### 2. Move SearchClient into radicle-search

httpd's `api/meili.rs` (`SearchClient`, `SortField`, `SearchError`) moves to a
new `radicle-search::query` module:

```
radicle-search/src/
  lib.rs          ← pub mod config, index, query;
  query.rs        ← SearchClient, SortField, SearchError (moved from httpd)
  index/          ← unchanged (write/admin operations)
  indexer/        ← unchanged (daemon logic)
```

`SortField::field()` references `index::repo::SORTABLE` constants (made `pub`)
instead of hardcoded string literals, closing the implicit schema coupling
between the two crates.

httpd's `api/meili.rs` is **deleted**. httpd re-exports from radicle-search:

```rust
#[cfg(feature = "search")]
pub(crate) use radicle_search::query::{SearchClient, SortField};
```

`SearchOptions` (httpd-specific config: `query_timeout`) stays in httpd's
`lib.rs`.

**Rationale:** All Meilisearch protocol knowledge in one crate. httpd drops
its direct `meilisearch-sdk` dependency — it comes transitively through
radicle-search. Field name constants are shared, preventing silent schema
drift.

### 3. Feature Flag: `search` (default-off)

**Cargo.toml (radicle-httpd):**

```toml
[features]
default = []
search = ["dep:radicle-search"]
logfmt = ["tracing-logfmt", "tracing-subscriber/env-filter"]

[dependencies]
radicle-search = { path = "../radicle-search", optional = true }
```

`meilisearch-sdk` is removed from httpd's direct dependencies entirely.

**Non-optional SearchClient:** When the `search` feature is enabled,
`SearchClient` is required — not wrapped in `Option<>`. Missing
`RADICLE_SEARCH_URL` at startup is a fatal error. Query failures return 503.
This is cleaner than runtime optionality: the feature flag is an explicit
opt-in; if you enable it, provide a Meilisearch instance.

**Default-off rationale:** The compile cost of `meilisearch-sdk` is negligible
(only 2 unique transitive crates beyond httpd's existing deps), so this is
about semantic clarity, not build performance. Default-off makes the opt-in
explicit. CI already uses `--all-features`.

**4 touch points for `#[cfg(feature = "search")]`:**

1. **`api.rs`** — imports + `Context` struct field:
   ```rust
   pub struct Context {
       profile: Arc<Profile>,
       cache: Option<Cache>,
       web_config: WebConfig,
       #[cfg(feature = "search")]
       search: SearchClient,
   }
   ```

2. **`api/v1/repos.rs`** — Meilisearch fast-path blocks in `repo_root_handler`
   and `repo_search_handler`. Without the feature, the storage-walk fallback is
   always taken.

3. **`api/v1/info.rs`** — `search_available` uses `cfg!(feature = "search")`
   (compile-time constant).

4. **`lib.rs` + `main.rs`** — `SearchOptions` struct and `RADICLE_SEARCH_URL`
   env var parsing.

**Behavior without the feature:** Identical to current behavior when
`RADICLE_SEARCH_URL` is unset — `/repos` sorts by RID, `/repos/search` does
storage-walk substring matching, `/info` reports `searchAvailable: false`.

### 4. CI and Nix Updates

**CI (`.github/workflows/check-radicle-httpd.yml` → `check-rust.yml`):**

- Remove `working-directory: ./radicle-httpd`, run from repo root
- `rust-cache` workspace: `. -> target`
- Test **both** feature configurations:
  - `cargo test -p radicle-httpd` — no search, exercises fallback paths
  - `cargo test --all-features` — search enabled, exercises feature gating
- `cargo clippy --all-features --tests` for full lint coverage
- `cargo fmt -- --check` works at workspace level

**Nix flake:**

- `fromRustupToolchainFile ./rust-toolchain` (was `./radicle-httpd/rust-toolchain`)
- `basicArgs.src` → `craneLib.cleanCargoSource ./.` (workspace root, Rust-only filter)
- `cargoToml` → `./crates/radicle-httpd + "/Cargo.toml"`
- `cargoExtraArgs` → `"-p radicle-httpd --features search"` for httpd package
- Add `radicle-search` package: `"-p radicle-search"`
- Add `radicle-search` to `checks`

### 5. Test Strategy

Fallback search logic (`SearchResult`, substring matching, sorting) stays
always-compiled and independently unit-tested, regardless of feature flag.

Endpoint-level fallback tests (e.g. `test_repos_root_sort_falls_back_without_search`)
are gated with `#[cfg(not(feature = "search"))]` — they test the no-search code
path which doesn't exist when the feature is on.

CI tests both configurations to ensure full coverage.

`Error::SearchUnavailable` is gated with `#[cfg(feature = "search")]` — the
variant only exists when search can fail.

## Commit Plan

4 commits in dependency order, each independently reviewable:

1. **Workspace setup** — create `crates/` directory, root `Cargo.toml`, move
   `rust-toolchain`, unify `Cargo.lock`, update crate Cargo.tomls to use
   workspace references
2. **Move SearchClient to radicle-search** — add `query` module to
   radicle-search, delete httpd's `meili.rs`, make SORTABLE/SEARCHABLE
   constants `pub`
3. **Add `search` feature flag** — gate imports, Context field, fast-path code,
   env parsing, and tests with `#[cfg(feature = "search")]`
4. **CI + Nix updates** — rename workflow, test both configurations, update
   flake paths and features, add radicle-search package
