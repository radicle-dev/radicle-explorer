# Workspace & Search Feature Flag Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Restructure radicle-explorer's Rust crates into a Cargo workspace under `crates/`, move the Meilisearch query client into radicle-search, and gate httpd's search integration behind a compile-time feature flag.

**Architecture:** Two Rust crates (`radicle-httpd`, `radicle-search`) are reorganized into a Cargo workspace with shared dependency versions. httpd's `SearchClient` (read-only Meilisearch queries) moves into `radicle-search::query`, making radicle-search the single owner of all Meilisearch protocol logic. A `search` feature flag (default-off) in radicle-httpd gates the `radicle-search` dependency; when enabled, `SearchClient` is required (non-optional), and missing `RADICLE_SEARCH_URL` is a startup error.

**Tech Stack:** Rust (edition 2021/2024), Cargo workspaces, meilisearch-sdk 0.33, Nix flakes with crane, GitHub Actions CI

**Design doc:** `docs/plans/2026-06-03-workspace-and-search-feature-flag-design.md`

---

## Phase 1: Structural Changes (Tasks 1–2)

### Task 1: Create Cargo Workspace

**TDD scenario:** Trivial structural change — verify with `cargo check --workspace`.

**Files:**
- Create: `Cargo.toml` (workspace root)
- Create: `rust-toolchain` (at repo root)
- Move: `radicle-httpd/` → `crates/radicle-httpd/`
- Move: `radicle-search/` → `crates/radicle-search/`
- Delete: `crates/radicle-httpd/Cargo.lock`
- Delete: `crates/radicle-search/Cargo.lock`
- Delete: `crates/radicle-httpd/rust-toolchain`
- Modify: `crates/radicle-httpd/Cargo.toml`
- Modify: `crates/radicle-search/Cargo.toml`
- Modify: `.gitignore`

**Step 1: Move directories**

```bash
mkdir -p crates
# Use jj/git to track the move
jj file move radicle-httpd crates/radicle-httpd
jj file move radicle-search crates/radicle-search
```

If `jj file move` is not available:
```bash
mv radicle-httpd crates/radicle-httpd
mv radicle-search crates/radicle-search
```

**Step 2: Create root `rust-toolchain`**

Write `rust-toolchain` at the repo root:

```
1.94.0
```

Delete the old one:
```bash
rm crates/radicle-httpd/rust-toolchain
```

**Step 3: Delete per-crate lockfiles**

```bash
rm crates/radicle-httpd/Cargo.lock
rm crates/radicle-search/Cargo.lock
```

**Step 4: Create root `Cargo.toml`**

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

**Step 5: Update `crates/radicle-httpd/Cargo.toml`**

Replace the full file. Changes from original:
- Add `license.workspace = true` and `homepage.workspace = true`, remove the literal values
- Replace shared deps with `<dep>.workspace = true`, adding crate-specific features where needed
- Deps **not** in workspace (httpd-only) keep their inline versions

```toml
[package]
name = "radicle-httpd"
description = "Radicle HTTP daemon"
homepage.workspace = true
license.workspace = true
version = "0.25.0"
authors = ["cloudhead <cloudhead@radicle.xyz>", "sebastinez <me@sebastinez.dev>"]
edition = "2021"
default-run = "radicle-httpd"
build = "build.rs"

[features]
default = []
logfmt = [
  "tracing-logfmt",
  "tracing-subscriber/env-filter"
]

[[bin]]
name = "radicle-httpd"
path = "src/main.rs"

[dependencies]
anyhow.workspace = true
axum = { version = "0.8.4", default-features = false, features = ["json", "query", "tokio", "http1"] }
axum-listener = { version = "0.2.2" }
base64 = { version = "0.22.1" }
chrono.workspace = true
futures-util = { version = "0.3.32", default-features = false }
hyper = { version = "1.6.0", default-features = false }
infer = { version = "0.19.0" }
lexopt.workspace = true
lru = { version = "0.16.0" }
meilisearch-sdk.workspace = true
mime_guess = { version = "2.0.5" }
nonempty = { version = "0.12.0", features = ["serialize"] }
radicle.workspace = true
radicle-job = { version = "0.6.0" }
radicle-surf = { workspace = true, features = ["serde"] }
radicle-term = { version = "0.18.0", default-features = false }
serde.workspace = true
serde_json = { workspace = true, features = ["preserve_order"] }
thiserror.workspace = true
tokio = { workspace = true, features = ["macros", "rt-multi-thread", "signal", "process", "io-util"] }
tokio-util = { version = "0.7.18", default-features = false, features = ["io"] }
tower-http = { version = "0.6.6", default-features = false, features = ["trace", "cors", "set-header", "decompression-full"] }
tracing.workspace = true
tracing-logfmt = { version = "0.3.5", optional = true }
tracing-subscriber.workspace = true
url = { version = "2.5.4", features = ["serde"] }
uuid = { version = "1.13.1", features = ["serde"] }

[dev-dependencies]
hyper = { version = "1.6", default-features = false, features = ["client"] }
pretty_assertions = { version = "1.4.1" }
radicle = { workspace = true, features = ["test"] }
radicle-crypto = { version = "0.17.0", features = ["test"] }
tempfile = { version = "3.20.0" }
tower = { version = "0.5.2", features = ["util"] }
```

**Step 6: Update `crates/radicle-search/Cargo.toml`**

```toml
[package]
name = "radicle-search"
description = "Optional search/index daemon for Radicle, alongside radicle-node and radicle-httpd"
homepage.workspace = true
license.workspace = true
version = "0.1.0"
edition = "2024"
default-run = "radicle-search"

[[bin]]
name = "radicle-search"
path = "src/main.rs"

[dependencies]
anyhow.workspace = true
chrono.workspace = true
lexopt.workspace = true
meilisearch-sdk.workspace = true
radicle.workspace = true
radicle-surf.workspace = true
serde.workspace = true
serde_json.workspace = true
thiserror.workspace = true
tokio = { workspace = true, features = ["macros", "rt-multi-thread", "signal", "sync", "time"] }
tracing.workspace = true
tracing-subscriber = { workspace = true, features = ["env-filter"] }
```

**Step 7: Update `.gitignore`**

In `.gitignore`, change:
```
radicle-httpd/target
radicle-httpd/build/artifacts
```
to:
```
crates/radicle-httpd/build/artifacts
```

(The bare `target` line already covers the workspace-level `target/`.)

**Step 8: Generate lockfile and verify**

```bash
cargo generate-lockfile
cargo check --workspace
```

Expected: compiles with no errors. A single `Cargo.lock` is generated at the repo root.

**Step 9: Run existing tests**

```bash
cargo test --workspace
```

Expected: all existing tests pass.

**Step 10: Commit**

```bash
jj commit -m "refactor: Create Cargo workspace under crates/"
```

---

### Task 2: Move SearchClient into radicle-search

**TDD scenario:** Modifying tested code — run existing tests before and after. The `SearchClient` code has no unit tests of its own (it wraps meilisearch-sdk), so we verify the move by compilation and existing integration-style tests.

**Files:**
- Create: `crates/radicle-search/src/query.rs`
- Modify: `crates/radicle-search/src/lib.rs`
- Modify: `crates/radicle-search/src/index/repo.rs` (make constants `pub`)
- Modify: `crates/radicle-httpd/Cargo.toml` (add `radicle-search` dep)
- Delete: `crates/radicle-httpd/src/api/meili.rs`
- Modify: `crates/radicle-httpd/src/api.rs` (change imports)
- Modify: `crates/radicle-httpd/src/api/v1/repos.rs` (change import)

**Step 1: Add field name constants to `crates/radicle-search/src/index/repo.rs`**

Currently the sortable field names are hardcoded strings in `SORTABLE`. Extract them as named constants and change visibility from `pub(crate)` to `pub`. In `crates/radicle-search/src/index/repo.rs`, replace lines 16-18:

```rust
pub(crate) const SORTABLE: &[&str] = &["headCommitterTime", "seedingCount", Document::PRIMARY_KEY];
pub(crate) const SEARCHABLE: &[&str] = &["name", "description"];
pub(crate) const FILTERABLE: &[&str] = &["delegates", "visibility"];
```

with:

```rust
/// Meilisearch field name for the head commit's committer timestamp.
pub const FIELD_HEAD_COMMITTER_TIME: &str = "headCommitterTime";
/// Meilisearch field name for the count of nodes seeding this repo.
pub const FIELD_SEEDING_COUNT: &str = "seedingCount";

pub const SORTABLE: &[&str] = &[FIELD_HEAD_COMMITTER_TIME, FIELD_SEEDING_COUNT, Document::PRIMARY_KEY];
pub const SEARCHABLE: &[&str] = &["name", "description"];
pub const FILTERABLE: &[&str] = &["delegates", "visibility"];
```

**Step 2: Verify radicle-search still compiles**

```bash
cargo check -p radicle-search
```

Expected: no errors.

**Step 3: Create `crates/radicle-search/src/query.rs`**

This is the `SearchClient` moved from httpd's `meili.rs`, adapted to use the shared constants. Note the change: `SortField::field()` now references `index::repo` constants, and `search_by_query` uses `FIELD_SEEDING_COUNT` instead of the hardcoded string.

```rust
use std::time::Duration;

use meilisearch_sdk::client::Client;
use meilisearch_sdk::indexes;
use meilisearch_sdk::search::Selectors;
use serde::Deserialize;
use thiserror::Error;

use radicle::identity::RepoId;

use crate::index::repo;

#[derive(Debug, Error)]
pub enum SearchError {
    #[error("search query timed out")]
    Timeout,
    #[error("meilisearch error: {0}")]
    Meili(#[from] meilisearch_sdk::errors::Error),
}

#[derive(Debug, Clone, Copy)]
pub enum SortField {
    HeadCommitterTime,
    SeedingCount,
}

impl SortField {
    fn field(self) -> &'static str {
        match self {
            Self::HeadCommitterTime => repo::FIELD_HEAD_COMMITTER_TIME,
            Self::SeedingCount => repo::FIELD_SEEDING_COUNT,
        }
    }
}

/// A read-only Meilisearch client for obtaining pre-sorted repo listings
/// and full-text search results. Document construction lives in the
/// indexer; this client only reads.
#[derive(Clone)]
pub struct SearchClient {
    index: indexes::Index,
    query_timeout: Duration,
}

#[derive(Deserialize)]
struct RidHit {
    rid: String,
}

impl SearchClient {
    pub fn new(
        url: &str,
        api_key: Option<&str>,
        index_name: &str,
        query_timeout: Duration,
    ) -> Result<Self, SearchError> {
        let client = Client::new(url, api_key)?;
        let index = client.index(index_name);
        Ok(Self {
            index,
            query_timeout,
        })
    }

    /// Return a sorted, paginated list of RIDs. Always sorts descending —
    /// the only useful direction for activity/seeding.
    pub async fn sorted_rids(
        &self,
        sort: SortField,
        offset: usize,
        limit: usize,
    ) -> Result<Vec<RepoId>, SearchError> {
        let sort_clause = format!("{}:desc", sort.field());
        let sort_attrs = [sort_clause.as_str()];
        let attrs = ["rid"];

        let mut query = self.index.search();
        query
            .with_sort(&sort_attrs)
            .with_offset(offset)
            .with_limit(limit)
            .with_attributes_to_retrieve(Selectors::Some(&attrs));

        let result = tokio::time::timeout(self.query_timeout, query.execute::<RidHit>())
            .await
            .map_err(|_| SearchError::Timeout)??;

        let rids = result
            .hits
            .into_iter()
            .filter_map(|hit| hit.result.rid.parse::<RepoId>().ok())
            .collect();
        Ok(rids)
    }

    /// Free-text search by name / description. Meilisearch ranks by its
    /// built-in relevance rules (typo-tolerant prefix match); ties — and
    /// the empty-query case — fall back to seedingCount desc.
    pub async fn search_by_query(
        &self,
        query: &str,
        offset: usize,
        limit: usize,
    ) -> Result<Vec<RepoId>, SearchError> {
        let sort_clause = format!("{}:desc", repo::FIELD_SEEDING_COUNT);
        let sort_attrs = [sort_clause.as_str()];
        let attrs = ["rid"];

        let mut search = self.index.search();
        search
            .with_query(query)
            .with_sort(&sort_attrs)
            .with_offset(offset)
            .with_limit(limit)
            .with_attributes_to_retrieve(Selectors::Some(&attrs));

        let result = tokio::time::timeout(self.query_timeout, search.execute::<RidHit>())
            .await
            .map_err(|_| SearchError::Timeout)??;

        let rids = result
            .hits
            .into_iter()
            .filter_map(|hit| hit.result.rid.parse::<RepoId>().ok())
            .collect();
        Ok(rids)
    }
}
```

**Step 4: Update `crates/radicle-search/src/lib.rs`**

Add the query module:

```rust
pub mod config;
pub mod index;
pub mod indexer;
pub mod query;
```

**Step 5: Verify radicle-search compiles**

```bash
cargo check -p radicle-search
```

Expected: no errors.

**Step 6: Add radicle-search dependency to httpd**

In `crates/radicle-httpd/Cargo.toml`, add under `[dependencies]`:

```toml
radicle-search = { path = "../radicle-search" }
```

**Step 7: Delete `crates/radicle-httpd/src/api/meili.rs`**

```bash
rm crates/radicle-httpd/src/api/meili.rs
```

**Step 8: Update `crates/radicle-httpd/src/api.rs` imports**

Replace:
```rust
mod meili;
```
with nothing (delete the line).

Replace:
```rust
pub use meili::{SearchClient, SortField};
```
with:
```rust
pub use radicle_search::query::{SearchClient, SortField};
```

**Step 9: Update `crates/radicle-httpd/src/api/v1/repos.rs` import**

Replace:
```rust
use crate::api::SortField;
```
with:
```rust
use radicle_search::query::SortField;
```

**Step 10: Verify httpd compiles and tests pass**

```bash
cargo check -p radicle-httpd
cargo test --workspace
```

Expected: all tests pass. The behavior is identical — only the import paths changed.

**Step 11: Commit**

```bash
jj commit -m "refactor: Move SearchClient into radicle-search::query"
```

---

## Phase 2: Feature Gating (Tasks 3–4)

> **Checkpoint:** Before proceeding, verify `cargo test --workspace` passes. Phase 2 changes the public API shape of radicle-httpd.

### Task 3: Add `search` Feature Flag to radicle-httpd

**TDD scenario:** Modifying tested code — run existing tests first, then modify with cfg gates, then verify both feature configurations.

This task has three parts: (A) make the dependency optional and gate types, (B) make SearchClient non-optional when feature is on, (C) gate tests.

**Files:**
- Modify: `crates/radicle-httpd/Cargo.toml`
- Modify: `crates/radicle-httpd/src/lib.rs`
- Modify: `crates/radicle-httpd/src/main.rs`
- Modify: `crates/radicle-httpd/src/api.rs`
- Modify: `crates/radicle-httpd/src/api/error.rs`
- Modify: `crates/radicle-httpd/src/api/v1/repos.rs`
- Modify: `crates/radicle-httpd/src/api/v1/info.rs`
- Modify: `crates/radicle-httpd/src/test.rs`

**Step 1: Run existing tests to establish baseline**

```bash
cargo test --workspace
```

Expected: all tests pass.

**Step 2: Update `crates/radicle-httpd/Cargo.toml`**

Change the `[features]` section and the `radicle-search` dependency:

Replace:
```toml
[features]
default = []
logfmt = [
  "tracing-logfmt",
  "tracing-subscriber/env-filter"
]
```
with:
```toml
[features]
default = []
search = ["dep:radicle-search"]
logfmt = [
  "tracing-logfmt",
  "tracing-subscriber/env-filter"
]
```

Replace:
```toml
radicle-search = { path = "../radicle-search" }
```
with:
```toml
radicle-search = { path = "../radicle-search", optional = true }
```

Remove the `meilisearch-sdk` line from `[dependencies]`:
```toml
meilisearch-sdk.workspace = true
```
(Delete this line entirely — it comes transitively through radicle-search when the feature is on.)

**Step 3: Update `crates/radicle-httpd/src/lib.rs`**

Gate `SearchOptions` behind the feature flag. Replace lines 54-63:

```rust
#[derive(Debug, Clone)]
pub struct Options {
    pub aliases: HashMap<String, RepoId>,
    pub listen: DualAddr,
    pub cache: Option<NonZeroUsize>,
    pub search: Option<SearchOptions>,
}

#[derive(Debug, Clone)]
pub struct SearchOptions {
    pub url: String,
    pub api_key: Option<String>,
    pub index_name: String,
    pub query_timeout: std::time::Duration,
}
```

with:

```rust
#[derive(Debug, Clone)]
pub struct Options {
    pub aliases: HashMap<String, RepoId>,
    pub listen: DualAddr,
    pub cache: Option<NonZeroUsize>,
    #[cfg(feature = "search")]
    pub search: SearchOptions,
}

#[cfg(feature = "search")]
#[derive(Debug, Clone)]
pub struct SearchOptions {
    pub url: String,
    pub api_key: Option<String>,
    pub index_name: String,
    pub query_timeout: std::time::Duration,
}
```

In the `routes` test module at the bottom of `lib.rs`, find the `Options` construction (around line 258):

```rust
            search: None,
```

Replace with:

```rust
            #[cfg(feature = "search")]
            search: crate::SearchOptions {
                url: "http://localhost:7700".to_string(),
                api_key: None,
                index_name: "repos".to_string(),
                query_timeout: std::time::Duration::from_millis(500),
            },
```

**Step 4: Update `crates/radicle-httpd/src/main.rs`**

Gate the `search_options_from_env` function and its usage. In `parse_options()`, replace:

```rust
        search: search_options_from_env()?,
```

with:

```rust
        #[cfg(feature = "search")]
        search: search_options_from_env()?,
```

Gate the function itself and the timeout helper. Find the `search_options_from_env` function (starts around line 120) and add `#[cfg(feature = "search")]` before it:

```rust
#[cfg(feature = "search")]
fn search_options_from_env() -> anyhow::Result<httpd::SearchOptions> {
```

**Important:** The return type changes from `Option<SearchOptions>` to `SearchOptions`. The function must now **require** `RADICLE_SEARCH_URL`. Replace the function body:

```rust
#[cfg(feature = "search")]
fn search_options_from_env() -> anyhow::Result<httpd::SearchOptions> {
    let url = std::env::var("RADICLE_SEARCH_URL")
        .map_err(|_| anyhow::anyhow!(
            "RADICLE_SEARCH_URL must be set when radicle-httpd is built with the 'search' feature"
        ))?;
    if url.is_empty() {
        anyhow::bail!(
            "RADICLE_SEARCH_URL must not be empty when radicle-httpd is built with the 'search' feature"
        );
    }
    let api_key = std::env::var("RADICLE_SEARCH_KEY")
        .ok()
        .filter(|s| !s.is_empty());
    let index_name = std::env::var("RADICLE_SEARCH_INDEX_NAME")
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "repos".to_string());
    let query_timeout = parse_timeout_ms_from_env("RADICLE_SEARCH_TIMEOUT_MS", 500)?;
    Ok(httpd::SearchOptions {
        url,
        api_key,
        index_name,
        query_timeout,
    })
}
```

Also gate the `parse_timeout_ms_from_env` function:

```rust
#[cfg(feature = "search")]
fn parse_timeout_ms_from_env(var: &str, default_ms: u64) -> anyhow::Result<std::time::Duration> {
```

And gate the test module for it. Find `mod tests` and add the cfg:

```rust
#[cfg(all(test, feature = "search"))]
mod tests {
```

**Step 5: Update `crates/radicle-httpd/src/api.rs`**

Gate the imports and change `Context`. Replace:

```rust
pub use radicle_search::query::{SearchClient, SortField};
```

with:

```rust
#[cfg(feature = "search")]
pub(crate) use radicle_search::query::{SearchClient, SortField};
```

Replace the `Context` struct:

```rust
#[derive(Clone)]
pub struct Context {
    profile: Arc<Profile>,
    cache: Option<Cache>,
    web_config: WebConfig,
    search: Option<SearchClient>,
}
```

with:

```rust
#[derive(Clone)]
pub struct Context {
    profile: Arc<Profile>,
    cache: Option<Cache>,
    web_config: WebConfig,
    #[cfg(feature = "search")]
    search: SearchClient,
}
```

Replace `Context::new()`. The old version:

```rust
    pub fn new(profile: Arc<Profile>, web_config: WebConfig, options: &Options) -> Self {
        let search = options.search.as_ref().and_then(|cfg| {
            match SearchClient::new(
                &cfg.url,
                cfg.api_key.as_deref(),
                &cfg.index_name,
                cfg.query_timeout,
            ) {
                Ok(client) => {
                    tracing::info!(
                        "search backend enabled: url={} index={}",
                        cfg.url,
                        cfg.index_name
                    );
                    Some(client)
                }
                Err(e) => {
                    tracing::warn!(
                        "failed to construct search backend client ({e:#}); continuing without it"
                    );
                    None
                }
            }
        });

        Self {
            profile: profile.clone(),
            cache: options.cache.map(Cache::new),
            web_config,
            search,
        }
    }
```

becomes:

```rust
    pub fn new(
        profile: Arc<Profile>,
        web_config: WebConfig,
        options: &Options,
    ) -> anyhow::Result<Self> {
        #[cfg(feature = "search")]
        let search = {
            let cfg = &options.search;
            let client = SearchClient::new(
                &cfg.url,
                cfg.api_key.as_deref(),
                &cfg.index_name,
                cfg.query_timeout,
            )
            .map_err(|e| anyhow::anyhow!("failed to construct search backend client: {e:#}"))?;
            tracing::info!(
                "search backend enabled: url={} index={}",
                cfg.url,
                cfg.index_name
            );
            client
        };

        Ok(Self {
            profile: profile.clone(),
            cache: options.cache.map(Cache::new),
            web_config,
            #[cfg(feature = "search")]
            search,
        })
    }
```

Replace `Context::search()`:

```rust
    pub fn search(&self) -> Option<&SearchClient> {
        self.search.as_ref()
    }
```

with:

```rust
    #[cfg(feature = "search")]
    pub fn search(&self) -> &SearchClient {
        &self.search
    }
```

**Step 6: Update `crates/radicle-httpd/src/api/error.rs`**

Gate the `SearchUnavailable` variant and its test:

```rust
    /// A search backend is configured but the query to it failed.
    #[error("search backend unavailable")]
    SearchUnavailable,
```

becomes:

```rust
    /// A search backend is configured but the query to it failed.
    #[cfg(feature = "search")]
    #[error("search backend unavailable")]
    SearchUnavailable,
```

In the `IntoResponse` impl, gate the match arm:

```rust
            Error::SearchUnavailable => (StatusCode::SERVICE_UNAVAILABLE, None),
```

becomes:

```rust
            #[cfg(feature = "search")]
            Error::SearchUnavailable => (StatusCode::SERVICE_UNAVAILABLE, None),
```

Gate the test:

```rust
    #[test]
    fn search_unavailable_maps_to_503() {
        let response = Error::SearchUnavailable.into_response();
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
```

becomes:

```rust
    #[cfg(feature = "search")]
    #[test]
    fn search_unavailable_maps_to_503() {
        let response = Error::SearchUnavailable.into_response();
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
```

**Step 7: Update `crates/radicle-httpd/src/api/v1/repos.rs`**

Gate the search-related imports. Replace:

```rust
use crate::api::SortField;
```

with:

```rust
#[cfg(feature = "search")]
use radicle_search::query::SortField;
```

In `repo_root_handler`, wrap the Meilisearch fast-path block (the block starting with `let search_sort = match` through the early `return`). Replace this entire block:

```rust
    // Fast path: if a search backend is configured and the requested sort
    // benefits from it, query the pre-computed index instead of walking
    // storage. Pinned listings and the default rid-sort stay on the storage
    // path because they're already cheap.
    let search_sort = match (&show, sort) {
        (RepoQuery::All, RepoSort::Activity) => Some(SortField::HeadCommitterTime),
        (RepoQuery::All, RepoSort::Seeding) => Some(SortField::SeedingCount),
        _ => None,
    };
    if let (Some(field), Some(search)) = (search_sort, ctx.search()) {
        // Read exactly one page-sized slice from Meili so that the offset of
        // the next page lines up cleanly with the end of this one. Filtering
        // (unseeded RIDs, missing storage) can make this page come back
        // short; that's intentional and self-heals once the indexer drops
        // the stale document.
        let policies = ctx.profile.policies()?;
        let offset = page.saturating_mul(per_page);
        let rids = search
            .sorted_rids(field, offset, per_page)
            .await
            .map_err(|e| {
                tracing::warn!("search backend failed ({e:#})");
                Error::SearchUnavailable
            })?;
        let collected: Vec<_> = rids
            .into_iter()
            .filter_map(|rid| {
                if !policies.is_seeding(&rid).unwrap_or_default() {
                    return None;
                }
                let (repo, doc) = ctx.repo(rid).ok()?;
                ctx.repo_info(&repo, doc).ok()
            })
            .collect();

        return Ok::<_, Error>(Json(collected));
    }

    // Activity and seeding sorts over the full repo set require a search
    // backend; the storage-walk implementations open or count every seeded
    // repo per request. Collapse to rid sort when no backend is configured.
    // Pinned listings are bounded by config so the dedicated arms below
    // remain cheap.
    let sort = if matches!(show, RepoQuery::All)
        && matches!(sort, RepoSort::Activity | RepoSort::Seeding)
    {
        RepoSort::Rid
    } else {
        sort
    };
```

with:

```rust
    // Fast path: when the search feature is compiled in, query the
    // pre-computed Meilisearch index for activity/seeding sorts instead of
    // walking storage.
    #[cfg(feature = "search")]
    {
        let search_sort = match (&show, sort) {
            (RepoQuery::All, RepoSort::Activity) => Some(SortField::HeadCommitterTime),
            (RepoQuery::All, RepoSort::Seeding) => Some(SortField::SeedingCount),
            _ => None,
        };
        if let Some(field) = search_sort {
            let policies = ctx.profile.policies()?;
            let offset = page.saturating_mul(per_page);
            let rids = ctx
                .search()
                .sorted_rids(field, offset, per_page)
                .await
                .map_err(|e| {
                    tracing::warn!("search backend failed ({e:#})");
                    Error::SearchUnavailable
                })?;
            let collected: Vec<_> = rids
                .into_iter()
                .filter_map(|rid| {
                    if !policies.is_seeding(&rid).unwrap_or_default() {
                        return None;
                    }
                    let (repo, doc) = ctx.repo(rid).ok()?;
                    ctx.repo_info(&repo, doc).ok()
                })
                .collect();

            return Ok::<_, Error>(Json(collected));
        }
    }

    // Without the search feature (or for pinned/rid sorts), collapse
    // activity/seeding to rid sort — the storage-walk implementations
    // would open every repo per request.
    let sort = if matches!(show, RepoQuery::All)
        && matches!(sort, RepoSort::Activity | RepoSort::Seeding)
    {
        RepoSort::Rid
    } else {
        sort
    };
```

In `repo_search_handler`, wrap the Meilisearch fast-path. Replace the block from `if let Some(search) = ctx.search()` through its closing brace:

```rust
    if let Some(search) = ctx.search() {
        let rids = search
            .search_by_query(&q, page * per_page, per_page)
            .await
            .map_err(|e| {
                tracing::warn!("search backend failed for query ({e:#})");
                Error::SearchUnavailable
            })?;
        let aliases = ctx.profile.aliases();
        let db = ctx.profile.database()?;
        let found_repos: Vec<SearchResult> = rids
            .into_iter()
            .enumerate()
            .filter_map(|(i, rid)| {
                let (_repo, doc_at) = ctx.repo(rid).ok()?;
                let seeds = db.count(&rid).unwrap_or_default();
                let delegates = doc_at
                    .doc
                    .delegates()
                    .iter()
                    .map(|did| match aliases.alias(did) {
                        Some(alias) => json!({ "id": did, "alias": alias }),
                        None => json!({ "id": did }),
                    })
                    .collect();
                Some(SearchResult {
                    rid,
                    payloads: doc_at.doc.payload().clone(),
                    delegates,
                    seeds,
                    index: i,
                })
            })
            .collect();
        return Ok::<_, Error>(Json(found_repos).into_response());
    }
```

with:

```rust
    #[cfg(feature = "search")]
    {
        let rids = ctx
            .search()
            .search_by_query(&q, page * per_page, per_page)
            .await
            .map_err(|e| {
                tracing::warn!("search backend failed for query ({e:#})");
                Error::SearchUnavailable
            })?;
        let aliases = ctx.profile.aliases();
        let db = ctx.profile.database()?;
        let found_repos: Vec<SearchResult> = rids
            .into_iter()
            .enumerate()
            .filter_map(|(i, rid)| {
                let (_repo, doc_at) = ctx.repo(rid).ok()?;
                let seeds = db.count(&rid).unwrap_or_default();
                let delegates = doc_at
                    .doc
                    .delegates()
                    .iter()
                    .map(|did| match aliases.alias(did) {
                        Some(alias) => json!({ "id": did, "alias": alias }),
                        None => json!({ "id": did }),
                    })
                    .collect();
                Some(SearchResult {
                    rid,
                    payloads: doc_at.doc.payload().clone(),
                    delegates,
                    seeds,
                    index: i,
                })
            })
            .collect();
        return Ok::<_, Error>(Json(found_repos).into_response());
    }
```

Also remove the now-unreachable comment block above this `#[cfg]` block (the "Fast path:" and "Responses are never cached:" comments move inside the `#[cfg]` block or are removed since the code is self-documenting).

**Step 8: Update `crates/radicle-httpd/src/api/v1/info.rs`**

Replace:

```rust
    let httpd = HttpdInfo {
        search_available: ctx.search().is_some(),
    };
```

with:

```rust
    let httpd = HttpdInfo {
        search_available: cfg!(feature = "search"),
    };
```

**Step 9: Update `crates/radicle-httpd/src/test.rs`**

In the `seed()` function (around line 332), replace:

```rust
    let options = crate::Options {
        aliases: std::collections::HashMap::new(),
        listen: axum_listener::DualAddr::Tcp(std::net::SocketAddr::from(([0, 0, 0, 0], 8080))),
        cache: Some(crate::DEFAULT_CACHE_SIZE),
        search: None,
    };

    let web_config = crate::api::WebConfig::from_profile(&profile);
    Context::new(Arc::new(profile), web_config, &options)
```

with:

```rust
    let options = crate::Options {
        aliases: std::collections::HashMap::new(),
        listen: axum_listener::DualAddr::Tcp(std::net::SocketAddr::from(([0, 0, 0, 0], 8080))),
        cache: Some(crate::DEFAULT_CACHE_SIZE),
        #[cfg(feature = "search")]
        search: crate::SearchOptions {
            url: "http://localhost:7700".to_string(),
            api_key: None,
            index_name: "repos".to_string(),
            query_timeout: std::time::Duration::from_millis(500),
        },
    };

    let web_config = crate::api::WebConfig::from_profile(&profile);
    Context::new(Arc::new(profile), web_config, &options).expect("test context creation failed")
```

Do the same for any other test helper functions that construct `Options` (check `seed_multi_peer` and similar). Search for `search: None` in test.rs and apply the same pattern.

Also update `crates/radicle-httpd/src/lib.rs` where `Context::new` is called in the `run()` function (around line 87):

```rust
    let ctx = api::Context::new(profile.clone(), web_config.clone(), &options);
```

becomes:

```rust
    let ctx = api::Context::new(profile.clone(), web_config.clone(), &options)?;
```

**Step 10: Gate fallback-path tests**

In `crates/radicle-httpd/src/api/v1/repos.rs`, add `#[cfg(not(feature = "search"))]` before each of these test functions:

- `test_repos_root_sort_activity` — asserts activity sort collapses to rid sort (only true without search)
- `test_repos_root_sort_falls_back_without_search`
- `test_repos_search_per_page_is_clamped` — uses fallback search path
- `test_repos_search_fallback_sets_cache_control`
- `test_repos_search_clamps_long_query`
- `test_search_repos` — tests fallback substring matching
- `test_search_repos_pagination`

In `crates/radicle-httpd/src/api/v1/info.rs`, gate:

- `test_info_without_search` — asserts `searchAvailable: false`

**Step 11: Verify without the feature (default)**

```bash
cargo test -p radicle-httpd
```

Expected: all non-gated tests pass. Fallback tests execute. Search-gated tests are skipped.

**Step 12: Verify with the feature**

```bash
cargo test -p radicle-httpd --features search
```

Expected: compiles. Search-gated tests execute. Fallback tests are skipped. Tests that hit the dummy SearchClient (pointing at localhost:7700 with nothing running) will get SearchError/503 — these endpoints are only tested in their non-search variant.

**Step 13: Verify full workspace**

```bash
cargo test --workspace --all-features
```

Expected: all tests pass across both crates.

**Step 14: Commit**

```bash
jj commit -m "feat: Gate search behind compile-time feature flag in radicle-httpd"
```

---

### Task 4: Update CI and Nix

**TDD scenario:** Config/infra changes — verify by inspection and build.

**Files:**
- Modify: `.github/workflows/check-radicle-httpd.yml` (rename to `check-rust.yml`)
- Modify: `flake.nix`

**Step 1: Replace CI workflow**

Rename and rewrite `.github/workflows/check-radicle-httpd.yml` to `.github/workflows/check-rust.yml`:

```yaml
name: check-rust
on:
  push:
  workflow_dispatch:

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

jobs:
  test:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: dtolnay/rust-toolchain@1.95
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: ". -> target"
      - name: Build (all features)
        run: cargo build --workspace --all-features
        env:
          RUSTFLAGS: -D warnings
      - name: Test (all features)
        run: cargo test --workspace --all-features
      - name: Test httpd without search
        run: cargo test -p radicle-httpd

  docs:
    name: Docs
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: dtolnay/rust-toolchain@1.95
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: ". -> target"
      - name: Docs
        run: cargo doc --workspace --all-features
        env:
          RUSTDOCFLAGS: -D warnings

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: dtolnay/rust-toolchain@1.95
        with:
          components: rustfmt, clippy
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: ". -> target"
      - name: Run clippy
        run: cargo clippy --workspace --all-features --tests
        env:
          RUSTFLAGS: -D warnings
      - name: Check formatting
        run: cargo fmt --all -- --check
```

Key changes from original:
- Removed `working-directory: ./radicle-httpd` defaults
- `workspaces: ". -> target"` instead of `radicle-httpd -> target`
- Added `--workspace` to all cargo commands
- Added "Test httpd without search" step
- `cargo fmt --all` for workspace-wide format check

**Step 2: Update `flake.nix`**

Apply these changes:

1. `rustToolchain` source: change `./radicle-httpd/rust-toolchain` to `./rust-toolchain`:

```nix
      rustToolchain = (pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain).override {
```

2. `basicArgs.src`: change `./radicle-httpd` to use `craneLib.cleanCargoSource ./.`:

```nix
      basicArgs = {
        pname = "radicle-explorer-rust";
        src = craneLib.cleanCargoSource ./.;
        strictDeps = true;
      };
```

3. In the `radicle-httpd` package, update `cargoToml` path and add `--features search`:

```nix
        radicle-httpd = craneLib.buildPackage (basicArgs
          // {
            inherit (craneLib.crateNameFromCargoToml {cargoToml = ./crates/radicle-httpd + "/Cargo.toml";}) pname version;
            cargoArtifacts = craneLib.buildDepsOnly basicArgs;
```

And change `cargoExtraArgs`:

```nix
            cargoExtraArgs = "-p radicle-httpd --features search";
```

4. Add `radicle-search` package and check:

In `checks`:
```nix
      checks = {
        radicle-explorer = self.packages.${system}.radicle-explorer.override {doCheck = true;};
        radicle-httpd = self.packages.${system}.radicle-httpd.overrideAttrs (_: {doCheck = true;});
        radicle-search = self.packages.${system}.radicle-search.overrideAttrs (_: {doCheck = true;});
      };
```

In `packages`, add after the `radicle-httpd` definition:

```nix
        radicle-search = craneLib.buildPackage (basicArgs
          // {
            inherit (craneLib.crateNameFromCargoToml {cargoToml = ./crates/radicle-search + "/Cargo.toml";}) pname version;
            cargoArtifacts = craneLib.buildDepsOnly basicArgs;

            nativeBuildInputs = with pkgs;
              [
                git
              ]
              ++ lib.optionals pkgs.stdenv.isDarwin (with pkgs; [
                libiconv
                darwin.apple_sdk.frameworks.Security
              ]);

            cargoExtraArgs = "-p radicle-search";
            doCheck = false;
          });
```

5. Update `radicle-explorer` check phase binary copy path (if it references httpd binary directly — check the `cp -t "$bins"` line). This should still work since the package output hasn't changed, only the source layout.

**Step 3: Verify Nix evaluation**

```bash
nix flake check --no-build 2>&1 | head -20
```

Expected: no evaluation errors (build may be skipped if deps aren't cached).

**Step 4: Verify Nix build (if feasible)**

```bash
nix build .#radicle-httpd --dry-run
nix build .#radicle-search --dry-run
```

**Step 5: Format Nix**

```bash
nix fmt
```

**Step 6: Commit**

```bash
jj commit -m "ci: Update CI and Nix for workspace structure"
```

---

## Post-Implementation Notes

- **`rust-toolchain` bump:** After these changes are submitted upstream, bump `rust-toolchain` from `1.94.0` to `1.95.0` to match CI.
- **Integration tests:** The Meilisearch code path (with feature on) is only tested via compilation and type checking. Full integration tests require a running Meilisearch instance — consider adding these later.
- **`radicle-search` CI:** The new `check-rust.yml` covers radicle-search via `--workspace`. No separate workflow needed.
