mod bootstrap;
pub(crate) mod build;
mod event;

use std::collections::{BTreeSet, HashSet};
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use radicle::Profile;
use radicle::identity::RepoId;
use radicle::node::{Alias, Event, Features, Handle as _, NodeId};
use radicle::storage::{ReadRepository, ReadStorage};
use tokio::sync::{RwLock, mpsc, watch};

use crate::config::Config;
use crate::index::{Indexes, client, cob, release, repo};

const UPSERT_BATCH: usize = 100;
const EVENT_CHANNEL_CAPACITY: usize = 1024;

struct BootstrapPayload {
    repo_docs: Vec<repo::Document>,
    kept_activity_docs: Vec<serde_json::Value>,
    seeded: HashSet<repo::DocumentKey>,
    issue_docs: Vec<cob::Document>,
    patch_docs: Vec<cob::Document>,
    release_docs: Vec<release::Document>,
    node_docs: Vec<crate::index::node::Document>,
    policy_docs: Vec<crate::index::policy::Document>,
    inventory_docs: Vec<crate::index::inventory::Document>,
}

pub struct Indexer {
    profile: Arc<Profile>,
    indexes: Arc<Indexes>,
    config: Config,
    seeded: Seeded,
}

/// An in-memory cache of locally-seeded repositories, given by their [`repo::RepoDocumentKey`].
///
/// It is used as a fast filter in the event hot path. It is refreshed at the
/// end of every bootstrap process, and will be stale between re-scans, i.e., a
/// new `rad seed` will not be picked up until the next re-scan.
struct Seeded {
    inner: Arc<RwLock<HashSet<repo::DocumentKey>>>,
}

impl Seeded {
    fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    async fn insert(&self, key: repo::DocumentKey) -> bool {
        self.inner.write().await.insert(key)
    }

    async fn remove(&self, key: &repo::DocumentKey) -> bool {
        self.inner.write().await.remove(key)
    }

    async fn replace(&self, keys: HashSet<repo::DocumentKey>) {
        *self.inner.write().await = keys;
    }

    async fn contains(&self, key: &repo::DocumentKey) -> bool {
        self.inner.read().await.contains(key)
    }

    async fn as_inner(&self) -> HashSet<repo::DocumentKey> {
        self.inner.read().await.clone()
    }
}

impl Indexer {
    pub fn new(profile: Arc<Profile>, indexes: Arc<Indexes>, config: Config) -> Self {
        Self {
            profile,
            indexes,
            config,
            seeded: Seeded::new(),
        }
    }

    pub async fn bootstrap(&self) -> Result<()> {
        tracing::info!("starting full storage rescan");
        let profile = self.profile.clone();
        let previous_seeded = self.seeded.as_inner().await;

        let handler = bootstrap::Bootstrap::new(previous_seeded);
        let stored_heads = self
            .indexes
            .repos
            .list_repo_heads()
            .await
            .unwrap_or_else(|e| {
                tracing::warn!("reading stored heads failed: {e:#}; walking every history");
                Default::default()
            });
        let BootstrapPayload {
            repo_docs,
            kept_activity_docs,
            seeded,
            issue_docs,
            patch_docs,
            release_docs,
            node_docs,
            policy_docs,
            inventory_docs,
        } = tokio::task::spawn_blocking(move || -> Result<BootstrapPayload> {
            use radicle::node::routing::Store as _;

            let policies = profile.policies()?;
            let db = profile.database()?;
            let repos = profile.storage.repositories()?;

            let seeds = repos
                .iter()
                .filter(|info| info.doc.visibility().is_public())
                .map(|info| {
                    let seeding_policy = match policies.is_seeding(&info.rid) {
                        Ok(true) => bootstrap::SeedingPolicy::IsSeeding,
                        Ok(false) => bootstrap::SeedingPolicy::NotSeeding,
                        Err(e) => {
                            tracing::warn!(
                                "policy lookup for {} failed: {e:#}; preserving prior state",
                                info.rid
                            );
                            bootstrap::SeedingPolicy::LookupFailure
                        }
                    };
                    bootstrap::RepoSeed {
                        rid: info.rid,
                        seeding_policy,
                    }
                });

            let plan = handler.plan(seeds);

            let mut docs = Vec::with_capacity(plan.to_index.len());
            let mut kept_activity_docs: Vec<serde_json::Value> = Vec::new();
            let mut issue_docs: Vec<cob::Document> = Vec::new();
            let mut patch_docs: Vec<cob::Document> = Vec::new();
            let mut release_docs: Vec<release::Document> = Vec::new();
            let mut remote_nids: BTreeSet<NodeId> = BTreeSet::new();
            for info in repos
                .iter()
                .filter(|info| plan.to_index.contains(&info.rid))
            {
                let stored_head = stored_heads.get(&repo::DocumentKey::new(info.rid).to_string());
                let head_unchanged = stored_head.is_some_and(|stored| {
                    profile
                        .storage
                        .repository(info.rid)
                        .ok()
                        .and_then(|repo| build::head(&repo).ok())
                        .is_some_and(|current| &current == stored)
                });
                let built = if head_unchanged {
                    build::document_with(&profile, &db, info.rid, &info.doc, |_| {
                        repo::Activity::empty()
                    })
                } else {
                    build::document(&profile, &db, info.rid, &info.doc)
                };
                match built {
                    Ok(Some(doc)) => {
                        let repo = match profile.storage.repository(info.rid) {
                            Ok(r) => r,
                            Err(e) => {
                                tracing::warn!("skipping {}: {e:#}", info.rid);
                                continue;
                            }
                        };
                        match repo.remotes() {
                            Ok(remotes) => {
                                remote_nids.extend(
                                    remotes
                                        .filter_map(|r| {
                                            r.inspect_err(|e| {
                                                tracing::warn!(
                                                    "{}: skipping unreadable remote: {e:#}",
                                                    info.rid
                                                )
                                            })
                                            .ok()
                                        })
                                        .map(|(id, _)| id),
                                );
                            }
                            Err(e) => {
                                tracing::warn!("{}: reading remotes failed: {e:#}", info.rid);
                            }
                        }
                        let cob_docs = build_cob_docs(&profile, &repo, info.rid);
                        issue_docs.extend(cob_docs.issues);
                        patch_docs.extend(cob_docs.patches);
                        release_docs.extend(cob_docs.releases);
                        if head_unchanged {
                            match without_activity(&doc) {
                                Ok(partial) => kept_activity_docs.push(partial),
                                Err(e) => tracing::warn!("skipping {}: {e:#}", info.rid),
                            }
                        } else {
                            docs.push(doc);
                        }
                    }
                    Ok(None) => {}
                    Err(e) => tracing::warn!("skipping {}: {e:#}", info.rid),
                }
            }

            let node_docs = build::node_documents(&profile, &db, remote_nids)?;
            let policy_docs = build::policy_documents(&profile)?;
            let inventory_docs = build::inventory_documents(db.entries()?);

            Ok(BootstrapPayload {
                repo_docs: docs,
                kept_activity_docs,
                seeded: plan.seeded,
                issue_docs,
                patch_docs,
                release_docs,
                node_docs,
                policy_docs,
                inventory_docs,
            })
        })
        .await
        .context("bootstrap blocking task panicked")??;

        let kept_activity = kept_activity_docs.len();
        let total = repo_docs.len() + kept_activity;
        tracing::info!("indexing {total} repositories ({kept_activity} with an unchanged head)");
        upsert_all(
            "repositories",
            &self.indexes.repos,
            &repo_docs,
            repo::Document::PRIMARY_KEY,
        )
        .await;
        for chunk in kept_activity_docs.chunks(UPSERT_BATCH) {
            if let Err(e) = self
                .indexes
                .repos
                .update(chunk, repo::Document::PRIMARY_KEY)
                .await
            {
                tracing::warn!(
                    "indexing a batch of {} repositories failed: {e:#}; \
                     skipping it (next rescan will reconcile)",
                    chunk.len()
                );
            }
        }

        let issue_ids: HashSet<String> = issue_docs.iter().map(|d| d.id.clone()).collect();
        let patch_ids: HashSet<String> = patch_docs.iter().map(|d| d.id.clone()).collect();
        let release_ids: HashSet<String> = release_docs.iter().map(|d| d.id.clone()).collect();
        let node_ids: HashSet<String> = node_docs.iter().map(|d| d.id.clone()).collect();
        let policy_ids: HashSet<String> = policy_docs.iter().map(|d| d.id.to_string()).collect();
        let inventory_ids: HashSet<String> = inventory_docs.iter().map(|d| d.id.clone()).collect();

        upsert_all(
            "issues",
            &self.indexes.issues,
            &issue_docs,
            cob::Document::PRIMARY_KEY,
        )
        .await;
        upsert_all(
            "patches",
            &self.indexes.patches,
            &patch_docs,
            cob::Document::PRIMARY_KEY,
        )
        .await;
        upsert_all(
            "releases",
            &self.indexes.releases,
            &release_docs,
            release::Document::PRIMARY_KEY,
        )
        .await;
        upsert_all(
            "nodes",
            &self.indexes.nodes,
            &node_docs,
            crate::index::node::Document::PRIMARY_KEY,
        )
        .await;
        upsert_all(
            "policies",
            &self.indexes.policies,
            &policy_docs,
            crate::index::policy::Document::PRIMARY_KEY,
        )
        .await;
        upsert_all(
            "inventory docs",
            &self.indexes.inventory,
            &inventory_docs,
            crate::index::inventory::Document::PRIMARY_KEY,
        )
        .await;

        self.seeded.replace(seeded.clone()).await;

        let removed = match self.indexes.repos.list_doc_ids().await {
            Ok(meili_ids) => {
                let meili_keys: HashSet<repo::DocumentKey> = meili_ids
                    .iter()
                    .filter_map(|s| {
                        RepoId::from_canonical(s)
                            .map(repo::DocumentKey::new)
                            .map_err(|e| {
                                tracing::warn!("skipping unparseable meili id {s:?}: {e:#}");
                                e
                            })
                            .ok()
                    })
                    .collect();
                let orphans = bootstrap::orphans(seeded.clone(), &meili_keys);
                if !orphans.is_empty() {
                    tracing::info!("removing {} orphan documents from index", orphans.len());
                    if let Err(e) = self
                        .indexes
                        .repos
                        .delete_many(&orphans.iter().map(|k| k.to_string()).collect::<Vec<_>>())
                        .await
                    {
                        tracing::warn!("orphan delete failed: {e:#}");
                    }
                }
                orphans.len()
            }
            Err(e) => {
                tracing::warn!(
                    "listing meili documents for reconciliation failed: {e:#}; \
                     skipping orphan delete this cycle"
                );
                0
            }
        };

        // Mirror indexes: plain id diff against the freshly built sets. The
        // freshly built issue/patch sets only ever contain documents for
        // repos still in `plan.to_index`, so this single diff covers both a
        // repo dropped from seeding entirely and an individual cob (e.g. a
        // redacted issue) removed from a repo that's still seeded.
        for (label, index, current) in [
            ("issues", &self.indexes.issues, issue_ids),
            ("patches", &self.indexes.patches, patch_ids),
            ("releases", &self.indexes.releases, release_ids),
            ("nodes", &self.indexes.nodes, node_ids),
            ("policies", &self.indexes.policies, policy_ids),
            ("inventory", &self.indexes.inventory, inventory_ids),
        ] {
            match index.list_doc_ids().await {
                Ok(ids) => {
                    let orphans = bootstrap::orphan_ids(&current, &ids);
                    if !orphans.is_empty()
                        && let Err(e) = index.delete_many(&orphans).await
                    {
                        tracing::warn!("{label}: orphan delete failed: {e:#}");
                    }
                }
                Err(e) => tracing::warn!("{label}: listing ids failed: {e:#}"),
            }
        }

        tracing::info!("rescan complete ({total} indexed, {removed} removed)");
        Ok(())
    }

    /// Bring the index in sync with the current local state of `rid`. If
    /// we're still seeding it, upsert a fresh document. If we've dropped
    /// it (or it's no longer indexable), delete the document and prune
    /// the seeded cache.
    pub async fn reindex(&self, rid: RepoId) -> Result<()> {
        let key = repo::DocumentKey::new(rid);
        let profile = self.profile.clone();
        let action = tokio::task::spawn_blocking(move || -> Result<ReindexAction> {
            let policies = profile.policies()?;
            // Propagate on lookup failure rather than treating it as
            // "not seeded" — a transient sqlite error would otherwise
            // delete the entry and prune the cache until the next full
            // rescan.
            if !policies.is_seeding(&rid)? {
                return Ok(ReindexAction::Delete);
            }
            let db = profile.database()?;
            let doc = {
                let repo = profile.storage.repository(rid)?;
                repo.identity_doc()?
            };
            match build::document(&profile, &db, rid, &doc)? {
                Some(repo_doc) => {
                    let repo = profile.storage.repository(rid)?;
                    Ok(ReindexAction::Upsert {
                        repo_doc: Box::new(repo_doc),
                        cob_docs: build_cob_docs(&profile, &repo, rid),
                    })
                }
                None => Ok(ReindexAction::Delete),
            }
        })
        .await
        .context("reindex blocking task panicked")??;

        match action {
            ReindexAction::Upsert { repo_doc, cob_docs } => {
                self.indexes
                    .repos
                    .upsert(
                        std::slice::from_ref(&*repo_doc),
                        repo::Document::PRIMARY_KEY,
                    )
                    .await?;
                for chunk in cob_docs.issues.chunks(UPSERT_BATCH) {
                    self.indexes
                        .issues
                        .upsert(chunk, cob::Document::PRIMARY_KEY)
                        .await?;
                }
                for chunk in cob_docs.patches.chunks(UPSERT_BATCH) {
                    self.indexes
                        .patches
                        .upsert(chunk, cob::Document::PRIMARY_KEY)
                        .await?;
                }
                for chunk in cob_docs.releases.chunks(UPSERT_BATCH) {
                    self.indexes
                        .releases
                        .upsert(chunk, release::Document::PRIMARY_KEY)
                        .await?;
                }
            }
            ReindexAction::Delete => {
                tracing::info!("removing {rid} from index (no longer seeded)");
                self.indexes.repos.delete(&key.to_string()).await?;
                let filter = crate::query::eq_filter("rid", rid);
                self.indexes.issues.delete_by_filter(&filter).await?;
                self.indexes.patches.delete_by_filter(&filter).await?;
                self.indexes.releases.delete_by_filter(&filter).await?;
                self.seeded.remove(&key).await;
            }
        }
        Ok(())
    }

    pub(crate) async fn handle_event(&self, event: &Event) -> Result<()> {
        let Some(class) = event::classify_event(event) else {
            tracing::debug!("ignored event: {}", event::event_kind(event));
            return Ok(());
        };
        match class {
            event::EventClass::Repo(rid, category) => {
                self.handle_repo_event(rid, category, event).await
            }
            event::EventClass::Node {
                nid,
                alias,
                features,
            } => self.handle_node_event(nid, alias, features).await,
            event::EventClass::Inventory { nid, inventory } => {
                self.handle_inventory_event(nid, inventory).await
            }
        }
    }

    async fn handle_repo_event(
        &self,
        rid: RepoId,
        category: event::EventCategory,
        event: &Event,
    ) -> Result<()> {
        let key = repo::DocumentKey::new(rid);
        let is_seeded = self.seeded.contains(&key).await;
        match event::event_action(category, is_seeded) {
            event::EventAction::Reindex => {}
            event::EventAction::DiscoverAndReindex => {
                self.seeded.insert(key).await;
                tracing::info!("discovered new local seed: {rid}");
            }
        }
        tracing::info!("reindex {rid} (event: {})", event::event_kind(event));
        if let Err(e) = self.reindex(rid).await {
            tracing::warn!("reindex {} failed: {e:#}", rid);
        }
        Ok(())
    }

    async fn handle_node_event(&self, nid: NodeId, alias: Alias, features: Features) -> Result<()> {
        let profile = self.profile.clone();
        let doc = tokio::task::spawn_blocking(move || {
            let db = profile.database()?;
            build::node_document_from_announcement(&profile, &db, nid, alias, features)
        })
        .await
        .context("node doc task panicked")?;
        let doc = match doc {
            Ok(Some(doc)) => doc,
            Ok(None) => {
                tracing::debug!("ignoring announcement from non-seed node {nid}");
                return Ok(());
            }
            Err(e) => {
                tracing::warn!("node doc for {nid} failed: {e:#}");
                return Ok(());
            }
        };
        if let Err(e) = self
            .indexes
            .nodes
            .upsert(
                std::slice::from_ref(&doc),
                crate::index::node::Document::PRIMARY_KEY,
            )
            .await
        {
            tracing::warn!("node doc upsert for {nid} failed: {e:#}");
        }
        Ok(())
    }

    async fn handle_inventory_event(&self, nid: NodeId, inventory: Vec<RepoId>) -> Result<()> {
        let doc = crate::index::inventory::Document::new(nid, inventory);
        if let Err(e) = self
            .indexes
            .inventory
            .upsert(
                std::slice::from_ref(&doc),
                crate::index::inventory::Document::PRIMARY_KEY,
            )
            .await
        {
            tracing::warn!("inventory doc upsert for {nid} failed: {e:#}");
        }
        Ok(())
    }

    pub async fn run(&self, mut shutdown: watch::Receiver<bool>) -> Result<()> {
        tokio::select! {
            _ = shutdown.changed() => return Ok(()),
            res = self.bootstrap() => res?,
        }

        let mut rescan_timer = tokio::time::interval(self.config.rescan_interval);
        rescan_timer.tick().await;

        loop {
            let sub_shutdown = shutdown.clone();
            tokio::select! {
                _ = shutdown.changed() => return Ok(()),
                res = self.subscribe_loop(sub_shutdown, &mut rescan_timer) => match res {
                    Ok(()) => tracing::warn!("event stream ended without error; reconnecting"),
                    Err(e) => tracing::warn!("event stream error: {e:#}; reconnecting"),
                },
            }
            tokio::select! {
                _ = shutdown.changed() => return Ok(()),
                _ = tokio::time::sleep(self.config.reconnect_backoff) => {}
            }
        }
    }

    async fn subscribe_loop(
        &self,
        mut shutdown: watch::Receiver<bool>,
        rescan_timer: &mut tokio::time::Interval,
    ) -> Result<()> {
        let socket = self.profile.home().socket_from_env();
        tracing::info!("subscribing to node events at {}", socket.display());
        let node = radicle::Node::new(&socket);

        let (tx, mut rx) = mpsc::channel::<Event>(EVENT_CHANNEL_CAPACITY);
        let blocking_shutdown = shutdown.clone();
        let blocking = tokio::task::spawn_blocking(move || -> Result<()> {
            let events = node
                .subscribe(Duration::from_secs(1))
                .context("subscribe to node socket failed")?;
            for event in events {
                if *blocking_shutdown.borrow() {
                    break;
                }
                let event = match event {
                    Ok(e) => e,
                    Err(radicle::node::Error::TimedOut) => continue,
                    Err(e) => {
                        return Err(anyhow::Error::from(e).context("event read failed"));
                    }
                };
                if tx.blocking_send(event).is_err() {
                    break;
                }
            }
            Ok(())
        });

        loop {
            tokio::select! {
                _ = shutdown.changed() => break,
                event = rx.recv() => {
                    let Some(event) = event else { break; };
                    self.handle_event(&event).await?;
                }
                _ = rescan_timer.tick() => {
                    if let Err(e) = self.bootstrap().await {
                        tracing::warn!("periodic rescan failed: {e:#}");
                    }
                }
            }
        }

        blocking
            .await
            .context("event reader task panicked")?
            .context("event reader task returned an error")?;
        Ok(())
    }
}

fn without_activity(doc: &repo::Document) -> Result<serde_json::Value> {
    let mut value = serde_json::to_value(doc)?;
    if let Some(fields) = value.as_object_mut() {
        for field in ["head", "headCommitterTime", "activityTimestamps"] {
            fields.remove(field);
        }
    }
    Ok(value)
}

struct CobDocs {
    issues: Vec<cob::Document>,
    patches: Vec<cob::Document>,
    releases: Vec<release::Document>,
}

enum ReindexAction {
    Upsert {
        repo_doc: Box<repo::Document>,
        cob_docs: CobDocs,
    },
    Delete,
}

/// Upserts `docs` in batches. A batch that still fails after the enqueue
/// retries is logged and skipped rather than aborting the whole rescan (which
/// would crash-loop the daemon); the next periodic rescan reconciles it.
async fn upsert_all<D: serde::Serialize + Send + Sync>(
    label: &str,
    index: &client::Index,
    docs: &[D],
    primary_key: &str,
) {
    for chunk in docs.chunks(UPSERT_BATCH) {
        if let Err(e) = index.upsert(chunk, primary_key).await {
            tracing::warn!(
                "indexing a batch of {} {label} failed: {e:#}; \
                 skipping it (next rescan will reconcile)",
                chunk.len()
            );
        }
    }
}

fn build_cob_docs(
    profile: &Profile,
    repo: &radicle::storage::git::Repository,
    rid: RepoId,
) -> CobDocs {
    use radicle::issue::cache::Issues as _;
    use radicle::patch::cache::Patches as _;

    let issues = match profile.issues(repo) {
        Ok(cache) => match cache.list() {
            Ok(iter) => iter
                .filter_map(|r| {
                    r.inspect_err(|e| tracing::warn!("{rid}: skipping unreadable cob row: {e:#}"))
                        .ok()
                })
                .filter_map(|(id, issue)| {
                    build::issue_document(rid, &id, &issue)
                        .inspect_err(|e| tracing::warn!("{rid}: skipping issue {id}: {e:#}"))
                        .ok()
                })
                .collect(),
            Err(e) => {
                tracing::warn!("{rid}: listing issues failed: {e:#}");
                Vec::new()
            }
        },
        Err(e) => {
            tracing::warn!("{rid}: opening issue cache failed: {e:#}");
            Vec::new()
        }
    };
    let patches = match profile.patches(repo) {
        Ok(cache) => match cache.list() {
            Ok(iter) => iter
                .filter_map(|r| {
                    r.inspect_err(|e| tracing::warn!("{rid}: skipping unreadable cob row: {e:#}"))
                        .ok()
                })
                .filter_map(|(id, patch)| {
                    build::patch_document(rid, &id, &patch)
                        .inspect_err(|e| tracing::warn!("{rid}: skipping patch {id}: {e:#}"))
                        .ok()
                })
                .collect(),
            Err(e) => {
                tracing::warn!("{rid}: listing patches failed: {e:#}");
                Vec::new()
            }
        },
        Err(e) => {
            tracing::warn!("{rid}: opening patch cache failed: {e:#}");
            Vec::new()
        }
    };
    let releases = match repo.identity_doc() {
        Ok(doc_at) => build::release_documents(rid, repo, doc_at.delegates()),
        Err(e) => {
            tracing::warn!("{rid}: reading identity doc for releases failed: {e:#}");
            Vec::new()
        }
    };
    CobDocs {
        issues,
        patches,
        releases,
    }
}
