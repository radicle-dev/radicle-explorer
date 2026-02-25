use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;

use axum::response::{IntoResponse, Json};
use axum::routing::get;
use axum::Router;
use serde_json::{json, Value};

use radicle::identity::crefs::GetCanonicalRefs;
use radicle::identity::doc::PayloadId;
use radicle::identity::{DocAt, RepoId};
use radicle::issue::cache::Issues as _;
use radicle::node::routing::Store;
use radicle::node::NodeId;
use radicle::patch::cache::Patches as _;
use radicle::storage::git::Repository;
use radicle::storage::{ReadRepository, ReadStorage};
use radicle::{git, web, Profile};
use tokio::sync::RwLock;

mod error;
mod json;
pub(crate) mod query;
mod v1;

use crate::api::error::Error;
use crate::cache::Cache;
use crate::Options;

pub const RADICLE_VERSION: &str = env!("RADICLE_VERSION");
// This version has to be updated on every breaking change to the radicle-httpd API.
pub const API_VERSION: &str = "6.1.0";

/// Thread-safe wrapper around radicle's web configuration.
///
/// This struct provides concurrent read/write access to web configuration
/// that can be dynamically reloaded (e.g., via SIGHUP) without restarting the server.
/// All access is synchronized via an async [`RwLock`] to prevent race conditions.
#[derive(Clone)]
pub struct WebConfig {
    inner: Arc<RwLock<web::Config>>,
}

impl WebConfig {
    /// Creates a new WebConfig from a [`Profile`]'s web configuration.
    pub fn from_profile(profile: &Profile) -> Self {
        let config = profile.config.web.clone();
        Self {
            inner: Arc::new(RwLock::new(config)),
        }
    }

    /// Return the underlying web configuration.
    pub async fn read(&self) -> web::Config {
        self.inner.read().await.clone()
    }

    /// Atomically updates the config by applying a function while holding the write lock.
    /// This prevents lost updates when multiple tasks attempt concurrent modifications.
    pub async fn update<F>(&self, f: F)
    where
        F: FnOnce(&mut web::Config),
    {
        let mut config = self.inner.write().await;
        f(&mut config);
    }
}

#[derive(Clone)]
pub struct Context {
    profile: Arc<Profile>,
    cache: Option<Cache>,
    web_config: WebConfig,
}

impl Context {
    pub fn new(profile: Arc<Profile>, web_config: WebConfig, options: &Options) -> Self {
        Self {
            profile: profile.clone(),
            cache: options.cache.map(Cache::new),
            web_config,
        }
    }

    #[allow(clippy::result_large_err)]
    pub fn repo_info<R: ReadRepository + radicle::cob::Store<Namespace = NodeId>>(
        &self,
        repo: &R,
        doc: DocAt,
    ) -> Result<repo::Info, error::Error> {
        let DocAt { doc, .. } = doc;
        let rid = repo.id();

        let aliases = self.profile.aliases();
        let delegates = doc
            .delegates()
            .iter()
            .map(|did| json::Author::new(did).as_json(&aliases))
            .collect::<Vec<_>>();
        let db = &self.profile.database()?;
        let seeding = db.count(&rid).unwrap_or_default();

        let payloads: BTreeMap<PayloadId, Value> = doc
            .payload()
            .iter()
            .filter_map(|(id, payload)| {
                if id == &PayloadId::project() {
                    let (_, head) = repo.head().ok()?;
                    let patches = self.profile.patches(repo).ok()?;
                    let patches = patches.counts().ok()?;
                    let issues = self.profile.issues(repo).ok()?;
                    let issues = issues.counts().ok()?;

                    Some((
                        id.clone(),
                        json!({
                            "data": payload,
                            "meta": {
                                "head": head,
                                "issues": issues,
                                "patches": patches
                            }
                        }),
                    ))
                } else {
                    Some((id.clone(), json!({ "data": payload })))
                }
            })
            .collect();

        // Compute canonical tags
        // Note: This requires converting R to Repository, so we compute it differently
        let canonical_tags = if let Ok(storage_repo) = self.profile.storage.repository(rid) {
            Self::compute_canonical_tags(&storage_repo, &doc).ok().flatten()
        } else {
            None
        };

        Ok(repo::Info {
            payloads,
            delegates,
            threshold: doc.threshold(),
            visibility: doc.visibility().clone(),
            rid,
            seeding,
            canonical_tags,
        })
    }

    /// Compute canonical tags that have reached consensus threshold.
    /// Returns map of tag name -> commit OID for tags with consensus.
    fn compute_canonical_tags(
        repo: &Repository,
        doc: &radicle::identity::Doc,
    ) -> Result<Option<BTreeMap<String, String>>, error::Error> {
        // Get canonical refs configuration
        let canonical_refs = match doc.canonical_refs().ok().flatten() {
            Some(crefs) => crefs,
            None => return Ok(None),
        };

        let rules = canonical_refs.rules();

        // Collect tag patterns from the rules
        let tag_patterns: Vec<String> = rules
            .iter()
            .filter_map(|(pattern, _)| {
                let pattern_str = pattern.to_string();
                if pattern_str.starts_with("refs/tags/") {
                    Some(pattern_str)
                } else {
                    None
                }
            })
            .collect();

        if tag_patterns.is_empty() {
            return Ok(None);
        }

        // Helper function to check if a refname matches any of the patterns
        let matches_pattern = |refname: &str| -> bool {
            for pattern in &tag_patterns {
                // Handle wildcard patterns like "refs/tags/releases/*"
                if pattern.ends_with("/*") {
                    let prefix = &pattern[..pattern.len() - 2]; // Remove "/*"
                    if refname.starts_with(prefix) {
                        return true;
                    }
                } else if pattern.ends_with('*') {
                    let prefix = &pattern[..pattern.len() - 1]; // Remove "*"
                    if refname.starts_with(prefix) {
                        return true;
                    }
                } else {
                    // Exact match
                    if refname == pattern {
                        return true;
                    }
                }
            }
            false
        };

        // Collect votes only for tags that match the canonical patterns
        let mut tag_votes: HashMap<String, HashMap<git::Oid, Vec<NodeId>>> = HashMap::new();

        for remote_result in repo.remotes()? {
            let (remote_id, remote) = remote_result?;

            // Iterate through remote's tag refs
            for (refname, oid) in remote.refs.iter() {
                let refname_str = refname.as_str();

                // Only collect votes for tags that match canonical patterns
                if refname_str.starts_with("refs/tags/") && matches_pattern(refname_str) {
                    if let Some(tag_name) = refname_str.strip_prefix("refs/tags/") {
                        tag_votes
                            .entry(tag_name.to_string())
                            .or_default()
                            .entry(*oid)
                            .or_default()
                            .push(remote_id.into());
                    }
                }
            }
        }

        // Check which tags have reached threshold
        let threshold = doc.threshold();
        let mut canonical_tags = BTreeMap::new();

        for (tag_name, oid_votes) in tag_votes {
            // Find the OID with the most votes
            if let Some((oid, voters)) = oid_votes.iter().max_by_key(|(_, voters)| voters.len()) {
                if voters.len() >= threshold {
                    canonical_tags.insert(tag_name, oid.to_string());
                }
            }
        }

        if canonical_tags.is_empty() {
            Ok(None)
        } else {
            Ok(Some(canonical_tags))
        }
    }

    /// Get a repository by RID, checking to make sure we're allowed to view it.
    #[allow(clippy::result_large_err)]
    pub fn repo(&self, rid: RepoId) -> Result<(Repository, DocAt), error::Error> {
        let repo = self.profile.storage.repository(rid)?;
        let doc = repo.identity_doc()?;
        // Don't allow accessing private repos.
        if doc.visibility().is_private() {
            return Err(Error::NotFound);
        }
        Ok((repo, doc))
    }

    /// Returns a reference to the thread-safe web configuration.
    ///
    /// Use this instead of accessing [`radicle::web::Config`] from the [`Profile`] to ensure
    /// you get the latest config after dynamic reloads.
    pub fn web_config(&self) -> &WebConfig {
        &self.web_config
    }

    #[cfg(test)]
    pub fn profile(&self) -> &Arc<Profile> {
        &self.profile
    }
}

pub fn router(ctx: Context) -> Router {
    Router::new()
        .route("/", get(root_handler))
        .merge(v1::router(ctx))
}

async fn root_handler() -> impl IntoResponse {
    let response = json!({
        "path": "/api",
        "links": [
            {
                "href": "/v1",
                "rel": "v1",
                "type": "GET"
            }
        ]
    });

    Json(response)
}

mod search {
    use std::cmp::Ordering;
    use std::collections::BTreeMap;

    use serde::{Deserialize, Serialize};
    use serde_json::json;

    use radicle::identity::doc::{Payload, PayloadId};
    use radicle::identity::RepoId;
    use radicle::node::routing::Store;
    use radicle::node::{AliasStore, Database};
    use radicle::profile::Aliases;
    use radicle::storage::RepositoryInfo;

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct SearchQueryString {
        pub q: Option<String>,
        pub page: Option<usize>,
        pub per_page: Option<usize>,
    }

    #[derive(Serialize, Deserialize, Eq, Debug)]
    pub struct SearchResult {
        pub rid: RepoId,
        pub payloads: BTreeMap<PayloadId, Payload>,
        pub delegates: Vec<serde_json::Value>,
        pub seeds: usize,
        #[serde(skip)]
        pub index: usize,
    }

    impl SearchResult {
        pub fn new(
            q: &str,
            info: RepositoryInfo,
            db: &Database,
            aliases: &Aliases,
        ) -> Option<Self> {
            if info.doc.visibility().is_private() {
                return None;
            }
            let Ok(Some(index)) = info.doc.project().map(|p| p.name().find(q)) else {
                return None;
            };
            let seeds = db.count(&info.rid).unwrap_or_default();
            let delegates = info
                .doc
                .delegates()
                .iter()
                .map(|did| match aliases.alias(did) {
                    Some(alias) => json!({
                        "id": did,
                        "alias": alias,
                    }),
                    None => json!({
                        "id": did,
                    }),
                })
                .collect::<Vec<_>>();

            Some(SearchResult {
                rid: info.rid,
                payloads: info.doc.payload().clone(),
                delegates,
                seeds,
                index,
            })
        }
    }

    impl Ord for SearchResult {
        fn cmp(&self, other: &Self) -> Ordering {
            match (self.index, other.index) {
                (0, 0) => self.seeds.cmp(&other.seeds),
                (0, _) => std::cmp::Ordering::Less,
                (_, 0) => std::cmp::Ordering::Greater,
                (ai, bi) if ai == bi => self.seeds.cmp(&other.seeds),
                (_, _) => self.seeds.cmp(&other.seeds),
            }
        }
    }

    impl PartialOrd for SearchResult {
        fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
            Some(self.cmp(other))
        }
    }

    impl PartialEq for SearchResult {
        fn eq(&self, other: &Self) -> bool {
            self.rid == other.rid
        }
    }
}

mod repo {
    use std::collections::BTreeMap;

    use serde::Serialize;
    use serde_json::Value;

    use radicle::identity::doc::PayloadId;
    use radicle::identity::{RepoId, Visibility};

    /// Repos info.
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Info {
        pub payloads: BTreeMap<PayloadId, Value>,
        pub delegates: Vec<Value>,
        pub threshold: usize,
        pub visibility: Visibility,
        pub rid: RepoId,
        pub seeding: usize,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub canonical_tags: Option<BTreeMap<String, String>>,
    }
}

#[cfg(test)]
mod tests {
    use crate::test;

    #[tokio::test]
    async fn test_web_config_accessor() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = test::seed(tmp.path());

        let config = ctx.web_config.read().await;
        assert_eq!(config.pinned.repositories.len(), 0);
    }

    #[tokio::test]
    async fn test_web_config_reload_simulation() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = test::seed(tmp.path());

        {
            let config = ctx.web_config.read().await;
            assert_eq!(config.pinned.repositories.len(), 0);
            assert_eq!(config.description, None);
        }

        {
            ctx.web_config
                .update(|config| {
                    config.description = Some("Updated description".to_string());
                    config.avatar_url = Some("https://example.com/avatar.png".to_string());
                })
                .await;
        }

        {
            let config = ctx.web_config.read().await;
            assert_eq!(config.description, Some("Updated description".to_string()));
            assert_eq!(
                config.avatar_url,
                Some("https://example.com/avatar.png".to_string())
            );
        }
    }

    #[tokio::test]
    async fn test_web_config_concurrent_reads() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = test::seed(tmp.path());

        let mut handles = vec![];
        for _ in 0..10 {
            let ctx_clone = ctx.clone();
            let handle = tokio::spawn(async move {
                let config = ctx_clone.web_config.read().await;
                config.pinned.repositories.len()
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_web_config_preserves_data_across_reads() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = test::seed(tmp.path());

        {
            ctx.web_config
                .update(|config| {
                    config.banner_url = Some("https://example.com/banner.png".to_string());
                })
                .await;
        }

        for _ in 0..5 {
            let config = ctx.web_config.read().await;
            assert_eq!(
                config.banner_url,
                Some("https://example.com/banner.png".to_string())
            );
        }
    }

    #[tokio::test]
    async fn test_profile_immutable_after_reload() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = test::seed(tmp.path());
        let original_key = ctx.profile.public_key;
        let original_home = ctx.profile.home.path().to_path_buf();

        {
            ctx.web_config
                .update(|config| {
                    config.description = Some("Updated".to_string());
                    config.avatar_url = Some("https://example.com/new-avatar.png".to_string());
                })
                .await;
        }

        assert_eq!(ctx.profile.public_key, original_key);
        assert_eq!(ctx.profile.home.path(), original_home);
    }

    #[tokio::test]
    async fn test_empty_pinned_repos_transitions() {
        use radicle::identity::RepoId;
        use std::str::FromStr;

        let tmp = tempfile::tempdir().unwrap();
        let ctx = test::seed(tmp.path());

        assert_eq!(ctx.web_config.read().await.pinned.repositories.len(), 0);

        let rid1 = RepoId::from_str("rad:z4FucBZHZMCsxTyQE1dfE2YR59Qbp").unwrap();
        let rid2 = RepoId::from_str("rad:z4GypKmh1gkEfmkXtarcYnkvtFUfE").unwrap();

        {
            ctx.web_config
                .update(|config| {
                    config.pinned.repositories.insert(rid1);
                    config.pinned.repositories.insert(rid2);
                })
                .await;
        }
        assert_eq!(ctx.web_config.read().await.pinned.repositories.len(), 2);

        {
            ctx.web_config
                .update(|config| {
                    config.pinned.repositories.clear();
                })
                .await;
        }
        assert_eq!(ctx.web_config.read().await.pinned.repositories.len(), 0);
    }
}
