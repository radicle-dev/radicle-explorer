use std::collections::{BTreeMap, BTreeSet, HashMap};

use axum::extract::{DefaultBodyLimit, State};
use axum::http::header;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use hyper::StatusCode;
use radicle_surf::blob::BlobRef;
use radicle_surf::{diff, Glob, Oid, Repository};
use serde::{Deserialize, Serialize};
use serde_json::json;

use radicle::cob::{issue::cache::Issues as _, patch::cache::Patches as _};
use radicle::identity::RepoId;
use radicle::node::{AliasStore, NodeId};
use radicle::storage::{ReadRepository, ReadStorage, RemoteRepository};

use crate::api;
use crate::api::error::Error;
use crate::api::query::{CobsQuery, PaginationQuery, RepoQuery};
use crate::api::search::{SearchQueryString, SearchResult};
use crate::api::Context;
use crate::axum_extra::{cached_response, immutable_response, Path, Query};

const MAX_BODY_LIMIT: usize = 4_194_304;

pub fn router(ctx: Context) -> Router {
    Router::new()
        .route("/repos", get(repo_root_handler))
        .route("/repos/search", get(repo_search_handler))
        .route("/repos/{rid}", get(repo_handler))
        .route("/repos/{rid}/commits", get(history_handler))
        .route("/repos/{rid}/commits/{sha}", get(commit_handler))
        .route("/repos/{rid}/diff/{base}/{oid}", get(diff_handler))
        .route("/repos/{rid}/activity", get(activity_handler))
        .route("/repos/{rid}/tree/{sha}/", get(tree_handler_root))
        .route("/repos/{rid}/tree/{sha}/{*path}", get(tree_handler))
        .route("/repos/{rid}/stats/tree/{sha}", get(stats_tree_handler))
        .route("/repos/{rid}/remotes", get(remotes_handler))
        .route("/repos/{rid}/remotes/{peer}", get(remote_handler))
        .route("/repos/{rid}/blob/{sha}/{*path}", get(blob_handler))
        .route("/repos/{rid}/readme/{sha}", get(readme_handler))
        .route("/repos/{rid}/issues", get(issues_handler))
        .route("/repos/{rid}/issues/{id}", get(issue_handler))
        .route("/repos/{rid}/patches", get(patches_handler))
        .route("/repos/{rid}/patches/{id}", get(patch_handler))
        .with_state(ctx)
        .layer(DefaultBodyLimit::max(MAX_BODY_LIMIT))
}

/// List all repos.
/// `GET /repos`
async fn repo_root_handler(
    State(ctx): State<Context>,
    Query(qs): Query<PaginationQuery>,
) -> impl IntoResponse {
    let PaginationQuery {
        show,
        page,
        per_page,
    } = qs;
    let page = page.unwrap_or(0);
    let web_config = ctx.web_config().read().await;
    let per_page = per_page.unwrap_or_else(|| match show {
        RepoQuery::Pinned => web_config.pinned.repositories.len(),
        _ => 10,
    });
    let storage = &ctx.profile.storage;
    let pinned = &web_config.pinned;
    let policies = ctx.profile.policies()?;

    let mut repos = match show {
        RepoQuery::All => storage
            .repositories()?
            .into_iter()
            .filter(|repo| repo.doc.visibility().is_public())
            .collect::<Vec<_>>(),
        RepoQuery::Pinned => storage
            .repositories_by_id(pinned.repositories.iter())
            .filter_map(|result| match result {
                Ok(repo) => Some(repo),
                Err(e) => {
                    tracing::warn!("Failed to load pinned repository: {}", e);
                    None
                }
            })
            .filter(|repo| repo.doc.visibility().is_public())
            .collect::<Vec<_>>(),
    };
    repos.sort_by_key(|p| p.rid);

    let infos = repos
        .into_iter()
        .filter_map(|info| {
            if !policies.is_seeding(&info.rid).unwrap_or_default() {
                return None;
            }
            let Ok((repo, doc)) = ctx.repo(info.rid) else {
                return None;
            };
            let Ok(repo_info) = ctx.repo_info(&repo, doc) else {
                return None;
            };

            Some(repo_info)
        })
        .skip(page * per_page)
        .take(per_page)
        .collect::<Vec<_>>();

    Ok::<_, Error>(Json(infos))
}

/// Search repositories by name.
/// `GET /repos/search?q=<query>`
///
/// We obtain the byte index of the first character of the query that matches the repo name.
/// And skip if the query doesn't match the repo name.
///
/// Sorting algorithm:
/// If both byte indices are 0, compare by seeding count.
/// A repo name with a byte index of 0 should come before non-zero indices.
/// If both indices are non-zero and equal, then compare by seeding count.
/// If none of the above, all non-zero indices are compared by their seeding count primarily.
async fn repo_search_handler(
    State(ctx): State<Context>,
    Query(SearchQueryString { q, per_page, page }): Query<SearchQueryString>,
) -> impl IntoResponse {
    let q = q.unwrap_or_default();
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(10);
    let storage = &ctx.profile.storage;
    let aliases = &ctx.profile.aliases();
    let db = &ctx.profile.database()?;
    let found_repos = storage
        .repositories()?
        .into_iter()
        .filter_map(|info| SearchResult::new(&q, info, db, aliases))
        .collect::<BTreeSet<SearchResult>>();

    let found_repos = found_repos
        .into_iter()
        .skip(page * per_page)
        .take(per_page)
        .collect::<Vec<_>>();

    Ok::<_, Error>(cached_response(found_repos, 600).into_response())
}

/// Get repo metadata.
/// `GET /repos/:rid`
async fn repo_handler(State(ctx): State<Context>, Path(rid): Path<RepoId>) -> impl IntoResponse {
    let (repo, doc) = ctx.repo(rid)?;
    let info = ctx.repo_info(&repo, doc)?;

    Ok::<_, Error>(Json(info))
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommitsQueryString {
    pub parent: Option<String>,
    pub since: Option<i64>,
    pub until: Option<i64>,
    pub page: Option<usize>,
    pub per_page: Option<usize>,
}

/// Get repo commit range.
/// `GET /repos/:rid/commits?parent=<sha>`
async fn history_handler(
    State(ctx): State<Context>,
    Path(rid): Path<RepoId>,
    Query(qs): Query<CommitsQueryString>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let (_, head) = repo.head()?;
    let CommitsQueryString {
        since,
        until,
        parent,
        page,
        per_page,
    } = qs;

    // If the parent commit is provided, the response depends only on the query
    // string and not on the state of the repository. This means we can instruct
    // the caches to treat the response as immutable.
    let is_immutable = parent.is_some();

    let sha = match parent {
        Some(commit) => commit,
        None => head.to_string(),
    };
    let repo = Repository::open(repo.path())?;

    // If a pagination is defined, we do not want to paginate the commits, and we return all of them on the first page.
    let page = page.unwrap_or(0);
    let per_page = if per_page.is_none() && (since.is_some() || until.is_some()) {
        usize::MAX
    } else {
        per_page.unwrap_or(30)
    };

    let commits = repo
        .history(&sha)?
        .filter_map(|commit| {
            let commit = commit.ok()?;
            let time = commit.committer.time.seconds();
            let commit = api::json::commit::Commit::new(&commit).as_json();
            match (since, until) {
                (Some(since), Some(until)) if time >= since && time < until => Some(commit),
                (Some(since), None) if time >= since => Some(commit),
                (None, Some(until)) if time < until => Some(commit),
                (None, None) => Some(commit),
                _ => None,
            }
        })
        .skip(page * per_page)
        .take(per_page)
        .collect::<Vec<_>>();

    if is_immutable {
        Ok::<_, Error>(immutable_response(commits).into_response())
    } else {
        Ok::<_, Error>(Json(commits).into_response())
    }
}

/// Get repo commit.
/// `GET /repos/:rid/commits/:sha`
async fn commit_handler(
    State(ctx): State<Context>,
    Path((rid, sha)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let repo = Repository::open(repo.path())?;
    let commit = repo.commit(sha)?;

    let diff = repo.diff_commit(commit.id)?;
    let glob = Glob::all_heads().branches().and(Glob::all_remotes());
    let branches: Vec<String> = repo
        .revision_branches(commit.id, glob)?
        .iter()
        .map(|b| b.refname().to_string())
        .collect();

    let mut files: HashMap<Oid, BlobRef<'_>> = HashMap::new();
    diff.files().for_each(|file_diff| match file_diff {
        diff::FileDiff::Added(added) => {
            if let Ok(blob) = repo.blob_ref(added.new.oid) {
                files.insert(blob.id(), blob);
            }
        }
        diff::FileDiff::Deleted(deleted) => {
            if let Ok(old_blob) = repo.blob_ref(deleted.old.oid) {
                files.insert(old_blob.id(), old_blob);
            }
        }
        diff::FileDiff::Modified(modified) => {
            if let (Ok(old_blob), Ok(new_blob)) = (
                repo.blob_ref(modified.old.oid),
                repo.blob_ref(modified.new.oid),
            ) {
                files.insert(old_blob.id(), old_blob);
                files.insert(new_blob.id(), new_blob);
            }
        }
        diff::FileDiff::Moved(moved) => {
            if let (Ok(old_blob), Ok(new_blob)) =
                (repo.blob_ref(moved.old.oid), repo.blob_ref(moved.new.oid))
            {
                files.insert(old_blob.id(), old_blob);
                files.insert(new_blob.id(), new_blob);
            }
        }
        diff::FileDiff::Copied(copied) => {
            if let (Ok(old_blob), Ok(new_blob)) =
                (repo.blob_ref(copied.old.oid), repo.blob_ref(copied.new.oid))
            {
                files.insert(old_blob.id(), old_blob);
                files.insert(new_blob.id(), new_blob);
            }
        }
    });

    let response: serde_json::Value = json!({
      "commit": api::json::commit::Commit::new(&commit).as_json(),
      "diff": api::json::diff::Diff::new(&diff).as_json(),
      "files": files,
      "branches": branches
    });
    Ok::<_, Error>(immutable_response(response))
}

/// Get diff between two commits
/// `GET /repos/:rid/diff/:base/:oid`
async fn diff_handler(
    State(ctx): State<Context>,
    Path((rid, base, oid)): Path<(RepoId, Oid, Oid)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let repo = Repository::open(repo.path())?;
    let base = repo.commit(base)?;
    let commit = repo.commit(oid)?;
    let diff = repo.diff(base.id, commit.id)?;
    let mut files: HashMap<Oid, BlobRef<'_>> = HashMap::new();
    diff.files().for_each(|file_diff| match file_diff {
        diff::FileDiff::Added(added) => {
            if let Ok(new_blob) = repo.blob_ref(added.new.oid) {
                files.insert(new_blob.id(), new_blob);
            }
        }
        diff::FileDiff::Deleted(deleted) => {
            if let Ok(old_blob) = repo.blob_ref(deleted.old.oid) {
                files.insert(old_blob.id(), old_blob);
            }
        }
        diff::FileDiff::Modified(modified) => {
            if let (Ok(new_blob), Ok(old_blob)) = (
                repo.blob_ref(modified.old.oid),
                repo.blob_ref(modified.new.oid),
            ) {
                files.insert(new_blob.id(), new_blob);
                files.insert(old_blob.id(), old_blob);
            }
        }
        diff::FileDiff::Moved(moved) => {
            if let (Ok(new_blob), Ok(old_blob)) =
                (repo.blob_ref(moved.new.oid), repo.blob_ref(moved.old.oid))
            {
                files.insert(new_blob.id(), new_blob);
                files.insert(old_blob.id(), old_blob);
            }
        }
        diff::FileDiff::Copied(copied) => {
            if let (Ok(new_blob), Ok(old_blob)) =
                (repo.blob_ref(copied.new.oid), repo.blob_ref(copied.old.oid))
            {
                files.insert(new_blob.id(), new_blob);
                files.insert(old_blob.id(), old_blob);
            }
        }
    });

    let commits = repo
        .history(commit.id)?
        .take_while(|c| {
            if let Ok(c) = c {
                c.id != base.id
            } else {
                false
            }
        })
        .map(|r| r.map(|c| api::json::commit::Commit::new(&c).as_json()))
        .collect::<Result<Vec<_>, _>>()?;

    let response = json!({ "diff": diff, "files": files, "commits": commits });

    Ok::<_, Error>(immutable_response(response))
}

/// Get repo activity for the past year.
/// `GET /repos/:rid/activity`
async fn activity_handler(
    State(ctx): State<Context>,
    Path(rid): Path<RepoId>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let current_date = chrono::Utc::now().timestamp();
    // SAFETY: The number of weeks is static and not out of bounds.
    #[allow(clippy::unwrap_used)]
    let one_year_ago = chrono::Duration::try_weeks(52).unwrap();
    let repo = Repository::open(repo.path())?;
    let head = repo.head()?;
    let timestamps = repo
        .history(head)?
        .filter_map(|a| {
            if let Ok(a) = a {
                let seconds = a.committer.time.seconds();
                if seconds > current_date - one_year_ago.num_seconds() {
                    return Some(seconds);
                }
            }
            None
        })
        .collect::<Vec<i64>>();

    Ok::<_, Error>(cached_response(json!({ "activity": timestamps }), 3600))
}

/// Get repo source tree for '/' path.
/// `GET /repos/:rid/tree/:sha/`
async fn tree_handler_root(
    State(ctx): State<Context>,
    Path((rid, sha)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    tree_handler(State(ctx), Path((rid, sha, String::new()))).await
}

/// Get repo source tree.
/// `GET /repos/:rid/tree/:sha/*path`
async fn tree_handler(
    State(ctx): State<Context>,
    Path((rid, sha, path)): Path<(RepoId, Oid, String)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;

    if let Some(ref cache) = ctx.cache {
        let cache = &mut cache.tree.lock().await;
        if let Some(response) = cache.get(&(rid, sha, path.clone())) {
            return Ok::<_, Error>(immutable_response(response.clone()));
        }
    }

    let repo = Repository::open(repo.path())?;
    let tree = repo.tree(sha, &path)?;
    let response = api::json::commit::Tree::new(&tree).as_json(&path);

    if let Some(cache) = &ctx.cache {
        let cache = &mut cache.tree.lock().await;
        cache.put((rid, sha, path.clone()), response.clone());
    }

    Ok::<_, Error>(immutable_response(response))
}

/// Get repo source tree stats.
/// `GET /repos/:rid/stats/tree/:sha`
async fn stats_tree_handler(
    State(ctx): State<Context>,
    Path((rid, sha)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let repo = Repository::open(repo.path())?;
    let stats = repo.stats_from(&sha)?;

    Ok::<_, Error>(immutable_response(stats))
}

/// Get all repo remotes.
/// `GET /repos/:rid/remotes`
async fn remotes_handler(State(ctx): State<Context>, Path(rid): Path<RepoId>) -> impl IntoResponse {
    let (repo, doc) = ctx.repo(rid)?;
    let delegates = doc.delegates();
    let aliases = &ctx.profile.aliases();

    // Compute canonical tags to exclude them from per-peer tags
    let canonical_tag_names: std::collections::HashSet<String> =
        Context::compute_canonical_tags(&repo, &doc)
            .ok()
            .flatten()
            .map(|tags| tags.keys().cloned().collect())
            .unwrap_or_default();

    let remotes = repo
        .remotes()?
        .filter_map(|r| r.map(|r| r.1).ok())
        .map(|remote| {
            let refs = remote
                .refs
                .iter()
                .filter_map(|(r, oid)| {
                    r.as_str().strip_prefix("refs/heads/").map(|head| {
                        let surf_oid = Oid::from(radicle::git::raw::Oid::from(oid));
                        (head.to_string(), surf_oid)
                    })
                })
                .collect::<BTreeMap<String, Oid>>();

            // Collect non-canonical tags for this peer
            let tags = remote
                .refs
                .iter()
                .filter_map(|(r, oid)| {
                    r.as_str().strip_prefix("refs/tags/").and_then(|tag| {
                        // Only include tags that are NOT canonical
                        if canonical_tag_names.contains(tag) {
                            None
                        } else {
                            // Peel the tag to get the commit OID
                            let raw_oid = radicle::git::raw::Oid::from(oid);
                            let commit_oid = match repo.backend.find_object(raw_oid, None) {
                                Ok(obj) => match obj.peel_to_commit() {
                                    Ok(commit) => commit.id(),
                                    Err(_) => raw_oid,
                                },
                                Err(_) => raw_oid,
                            };
                            let surf_oid = Oid::from(commit_oid);
                            Some((tag.to_string(), surf_oid))
                        }
                    })
                })
                .collect::<BTreeMap<String, Oid>>();

            match aliases.alias(&remote.id) {
                Some(alias) => json!({
                    "id": remote.id,
                    "alias": alias,
                    "heads": refs,
                    "tags": tags,
                    "delegate": delegates.contains(&remote.id.into()),
                }),
                None => json!({
                    "id": remote.id,
                    "heads": refs,
                    "tags": tags,
                    "delegate": delegates.contains(&remote.id.into()),
                }),
            }
        })
        .collect::<Vec<_>>();

    Ok::<_, Error>(Json(remotes))
}

/// Get repo remote.
/// `GET /repos/:rid/remotes/:peer`
async fn remote_handler(
    State(ctx): State<Context>,
    Path((rid, node_id)): Path<(RepoId, NodeId)>,
) -> impl IntoResponse {
    let (repo, doc) = ctx.repo(rid)?;
    let delegates = doc.delegates();
    let remote = repo.remote(&node_id)?;

    // Compute canonical tags to exclude them from per-peer tags
    let canonical_tag_names: std::collections::HashSet<String> =
        Context::compute_canonical_tags(&repo, &doc)
            .ok()
            .flatten()
            .map(|tags| tags.keys().cloned().collect())
            .unwrap_or_default();

    let refs = remote
        .refs
        .iter()
        .filter_map(|(r, oid)| {
            r.as_str().strip_prefix("refs/heads/").map(|head| {
                let surf_oid = Oid::from(radicle::git::raw::Oid::from(oid));
                (head.to_string(), surf_oid)
            })
        })
        .collect::<BTreeMap<String, Oid>>();

    // Collect non-canonical tags for this peer
    let tags = remote
        .refs
        .iter()
        .filter_map(|(r, oid)| {
            r.as_str().strip_prefix("refs/tags/").and_then(|tag| {
                // Only include tags that are NOT canonical
                if canonical_tag_names.contains(tag) {
                    None
                } else {
                    // Peel the tag to get the commit OID
                    let raw_oid = radicle::git::raw::Oid::from(oid);
                    let commit_oid = match repo.backend.find_object(raw_oid, None) {
                        Ok(obj) => match obj.peel_to_commit() {
                            Ok(commit) => commit.id(),
                            Err(_) => raw_oid,
                        },
                        Err(_) => raw_oid,
                    };
                    let surf_oid = Oid::from(commit_oid);
                    Some((tag.to_string(), surf_oid))
                }
            })
        })
        .collect::<BTreeMap<String, Oid>>();

    let remote = json!({
        "id": remote.id,
        "heads": refs,
        "tags": tags,
        "delegate": delegates.contains(&remote.id.into()),
    });

    Ok::<_, Error>(Json(remote))
}

/// Get repo source file.
/// `GET /repos/:rid/blob/:sha/*path`
async fn blob_handler(
    State(ctx): State<Context>,
    Path((rid, sha, path)): Path<(RepoId, Oid, String)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let repo = Repository::open(repo.path())?;
    let blob = repo.blob(sha, &path)?;

    if blob.size() > MAX_BODY_LIMIT {
        return Ok::<_, Error>(
            (
                StatusCode::PAYLOAD_TOO_LARGE,
                [(header::CACHE_CONTROL, "no-cache")],
                Json(json!([])),
            )
                .into_response(),
        );
    }
    Ok::<_, Error>(
        immutable_response(api::json::commit::Blob::new(&blob).as_json(&path)).into_response(),
    )
}

/// Get repo readme.
/// `GET /repos/:rid/readme/:sha`
async fn readme_handler(
    State(ctx): State<Context>,
    Path((rid, sha)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let repo = Repository::open(repo.path())?;
    let paths = [
        "README",
        "README.md",
        "README.markdown",
        "README.txt",
        "README.rst",
        "README.org",
        "Readme.md",
    ];

    for path in paths
        .iter()
        .map(ToString::to_string)
        .chain(paths.iter().map(|p| p.to_lowercase()))
    {
        if let Ok(blob) = repo.blob(sha, &path) {
            if blob.size() > MAX_BODY_LIMIT {
                return Ok::<_, Error>(
                    (
                        StatusCode::PAYLOAD_TOO_LARGE,
                        [(header::CACHE_CONTROL, "no-cache")],
                        Json(json!([])),
                    )
                        .into_response(),
                );
            }

            return Ok::<_, Error>(
                immutable_response(api::json::commit::Blob::new(&blob).as_json(&path))
                    .into_response(),
            );
        }
    }

    Err(Error::NotFound)
}

/// Get repo issues list.
/// `GET /repos/:rid/issues`
async fn issues_handler(
    State(ctx): State<Context>,
    Path(rid): Path<RepoId>,
    Query(qs): Query<CobsQuery<api::query::IssueStatus>>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let CobsQuery {
        page,
        per_page,
        status,
    } = qs;
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(10);
    let status = status.unwrap_or_default();
    let issues = ctx.profile.issues(&repo)?;
    let mut issues: Vec<_> = issues
        .list()?
        .filter_map(|r| {
            let (id, issue) = r.ok()?;
            (status.matches(issue.state())).then_some((id, issue))
        })
        .collect::<Vec<_>>();

    issues.sort_by(|(_, a), (_, b)| b.timestamp().cmp(&a.timestamp()));
    let aliases = &ctx.profile.aliases();
    let issues = issues
        .into_iter()
        .map(|(id, issue)| api::json::cobs::Issue::new(&issue).as_json(id, aliases))
        .skip(page * per_page)
        .take(per_page)
        .collect::<Vec<_>>();

    Ok::<_, Error>(Json(issues))
}

/// Get repo issue.
/// `GET /repos/:rid/issues/:id`
async fn issue_handler(
    State(ctx): State<Context>,
    Path((rid, issue_id)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let issue = ctx
        .profile
        .issues(&repo)?
        .get(&(&*issue_id).into())?
        .ok_or(Error::NotFound)?;
    let aliases = ctx.profile.aliases();

    Ok::<_, Error>(Json(
        api::json::cobs::Issue::new(&issue).as_json((&*issue_id).into(), &aliases),
    ))
}

/// Get repo patches list.
/// `GET /repos/:rid/patches`
async fn patches_handler(
    State(ctx): State<Context>,
    Path(rid): Path<RepoId>,
    Query(qs): Query<CobsQuery<api::query::PatchStatus>>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let CobsQuery {
        page,
        per_page,
        status,
    } = qs;
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(10);
    let status = status.unwrap_or_default();
    let patches = ctx.profile.patches(&repo)?;
    let mut patches = patches
        .list()?
        .filter_map(|r| {
            let (id, patch) = r.ok()?;
            (status.matches(patch.state())).then_some((id, patch))
        })
        .collect::<Vec<_>>();
    patches.sort_by(|(_, a), (_, b)| b.timestamp().cmp(&a.timestamp()));
    let aliases = ctx.profile.aliases();
    let patches = patches
        .into_iter()
        .map(|(id, patch)| api::json::cobs::Patch::new(&patch).as_json(id, &repo, &aliases))
        .skip(page * per_page)
        .take(per_page)
        .collect::<Vec<_>>();

    Ok::<_, Error>(Json(patches))
}

/// Get repo patch.
/// `GET /repos/:rid/patches/:id`
async fn patch_handler(
    State(ctx): State<Context>,
    Path((rid, patch_id)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    let (repo, _) = ctx.repo(rid)?;
    let patches = ctx.profile.patches(&repo)?;
    let patch = patches.get(&(&*patch_id).into())?.ok_or(Error::NotFound)?;
    let aliases = ctx.profile.aliases();

    Ok::<_, Error>(Json(api::json::cobs::Patch::new(&patch).as_json(
        (&*patch_id).into(),
        &repo,
        &aliases,
    )))
}

#[cfg(test)]
mod routes {
    use std::net::SocketAddr;

    use axum::extract::connect_info::MockConnectInfo;
    use axum::http::StatusCode;
    use pretty_assertions::assert_eq;
    use radicle::storage::ReadStorage;
    use serde_json::json;

    use crate::test::*;

    #[tokio::test]
    async fn test_repos_root() {
        let tmp = tempfile::tempdir().unwrap();
        let seed = seed(tmp.path());
        let app = super::router(seed.clone())
            .layer(MockConnectInfo(SocketAddr::from(([127, 0, 0, 1], 8080))));
        let response = get(&app, "/repos?show=all").await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
              {
                "payloads": {
                  "xyz.radicle.project": {
                    "data": {
                      "defaultBranch": "master",
                      "description": "Rad repository for tests",
                      "name": "hello-world",
                    },
                    "meta": {
                      "head": HEAD,
                      "patches": {
                        "open": 1,
                        "draft": 0,
                        "archived": 0,
                        "merged": 0,
                      },
                      "issues": {
                        "open": 1,
                        "closed": 0,
                      },
                    }
                  }
                },
                "delegates": [
                  {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS
                  },
                ],
                "threshold": 1,
                "visibility": {
                  "type": "public"
                },
                "rid": RID,
                "seeding": 1,
              },
              {
                "payloads": {
                  "xyz.radicle.project": {
                    "data": {
                      "defaultBranch": "master",
                      "description": "Rad repository for sorting",
                      "name": "again-hello-world",
                    },
                    "meta": {
                      "head": "344dcd184df5bf37aab6c107fa9371a1c5b3321a",
                      "patches": {
                        "open": 0,
                        "draft": 0,
                        "archived": 0,
                        "merged": 0,
                      },
                      "issues": {
                        "open": 0,
                        "closed": 0,
                      },
                    }
                  }
                },
                "delegates": [
                  {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS
                  }
                ],
                "threshold": 1,
                "visibility": {
                  "type": "public"
                },
                "rid": "rad:z4GypKmh1gkEfmkXtarcYnkvtFUfE",
                "seeding": 1,
              },
            ])
        );

        let app = super::router(seed).layer(MockConnectInfo(SocketAddr::from((
            [192, 168, 13, 37],
            8080,
        ))));
        let response = get(&app, "/repos?show=all").await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
              {
                "payloads": {
                  "xyz.radicle.project": {
                    "data": {
                      "defaultBranch": "master",
                      "description": "Rad repository for tests",
                      "name": "hello-world",
                    },
                    "meta": {
                      "head": HEAD,
                      "patches": {
                        "open": 1,
                        "draft": 0,
                        "archived": 0,
                        "merged": 0,
                      },
                      "issues": {
                        "open": 1,
                        "closed": 0,
                      },
                    }
                  }
                },
                "delegates": [
                  {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS
                  }
                ],
                "threshold": 1,
                "visibility": {
                  "type": "public"
                },
                "rid": RID,
                "seeding": 1,
              },
              {
                "payloads": {
                  "xyz.radicle.project": {
                    "data": {
                      "name": "again-hello-world",
                      "description": "Rad repository for sorting",
                      "defaultBranch": "master",
                    },
                    "meta": {
                      "head": "344dcd184df5bf37aab6c107fa9371a1c5b3321a",
                      "patches": {
                        "open": 0,
                        "draft": 0,
                        "archived": 0,
                        "merged": 0,
                      },
                      "issues": {
                        "open": 0,
                        "closed": 0,
                      },
                    }
                  }
                },
                "delegates": [
                  {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS
                  },
                ],
                "threshold": 1,
                "visibility": {
                  "type": "public"
                },
                "rid": "rad:z4GypKmh1gkEfmkXtarcYnkvtFUfE",
                "seeding": 1,
              },
            ])
        );
    }

    #[tokio::test]
    async fn test_repos() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "payloads": {
                  "xyz.radicle.project": {
                    "data": {
                      "defaultBranch": "master",
                      "description": "Rad repository for tests",
                      "name": "hello-world",
                    },
                    "meta": {
                      "head": HEAD,
                      "patches": {
                        "open": 1,
                        "draft": 0,
                        "archived": 0,
                        "merged": 0,
                      },
                      "issues": {
                        "open": 1,
                        "closed": 0,
                      },
                    }
                  }
                },
               "delegates": [
                 {
                   "id": DID,
                   "alias": CONTRIBUTOR_ALIAS,
                 }
               ],
               "threshold": 1,
               "visibility": {
                 "type": "public"
               },
               "rid": RID,
               "seeding": 1,
            })
        );
    }

    #[tokio::test]
    async fn test_search_repos() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, "/repos/search?q=hello").await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
              {
                "payloads": {
                  "xyz.radicle.project": {
                    "name": "hello-world",
                    "description": "Rad repository for tests",
                    "defaultBranch": "master",
                  }
                },
                "rid": "rad:z4FucBZHZMCsxTyQE1dfE2YR59Qbp",
                "delegates": [
                  {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS
                  }
                ],
                "seeds": 1,
              },
              {
                "payloads": {
                  "xyz.radicle.project": {
                    "name": "again-hello-world",
                    "description": "Rad repository for sorting",
                    "defaultBranch": "master",
                  },
                },
                "rid": "rad:z4GypKmh1gkEfmkXtarcYnkvtFUfE",
                "delegates": [
                  {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS
                  },
                ],
                "seeds": 1,
              },
            ])
        );
    }

    #[tokio::test]
    async fn test_search_repos_pagination() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, "/repos/search?q=hello&perPage=1").await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
              {
                "rid": "rad:z4FucBZHZMCsxTyQE1dfE2YR59Qbp",
                "payloads": {
                  "xyz.radicle.project": {
                    "defaultBranch": "master",
                    "description": "Rad repository for tests",
                    "name": "hello-world",
                  },
                },
                "delegates": [
                  {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS,
                  }
                ],
                "seeds": 1,
              },
            ])
        );
    }

    #[tokio::test]
    async fn test_repos_not_found() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, "/repos/rad:z2u2CP3ZJzB7ZqE8jHrau19yjcfCQ").await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_repos_commits_root() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/commits")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
                {
                  "id": HEAD,
                  "author": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz"
                  },
                  "summary": "Add another folder",
                  "description": "",
                  "parents": [
                    "ee8d6a29304623a78ebfa5eeed5af674d0e58f83",
                  ],
                  "committer": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz",
                    "time": 1673003014
                  },
                },
                {
                  "id": PARENT,
                  "author": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz"
                  },
                  "summary": "Add contributing file",
                  "description": "",
                  "parents": [
                    "f604ce9fd5b7cc77b7609beda45ea8760bee78f7",
                  ],
                  "committer": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz",
                    "time": 1673002014,
                  },
                },
                {
                  "id": INITIAL_COMMIT,
                  "author": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz",
                  },
                  "summary": "Initial commit",
                  "description": "",
                  "parents": [],
                  "committer": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz",
                    "time": 1673001014,
                  },
                },
            ])
        );
    }

    #[tokio::test]
    async fn test_repos_commits() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/commits/{HEAD}")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
              "commit": {
                "id": HEAD,
                "author": {
                  "name": "Alice Liddell",
                  "email": "alice@radicle.xyz"
                },
                "summary": "Add another folder",
                "description": "",
                "parents": [
                  "ee8d6a29304623a78ebfa5eeed5af674d0e58f83",
                ],
                "committer": {
                  "name": "Alice Liddell",
                  "email": "alice@radicle.xyz",
                  "time": 1673003014
                },
              },
              "diff": {
                "files": [
                  {
                    "status": "deleted",
                    "path": "CONTRIBUTING",
                    "diff": {
                      "type": "plain",
                      "hunks": [
                        {
                          "header": "@@ -1 +0,0 @@\n",
                          "lines": [
                            {
                              "line": "Thank you very much!\n",
                              "lineNo": 1,
                              "type": "deletion",
                            },
                          ],
                          "old":  {
                            "start": 1,
                            "end": 2,
                          },
                          "new": {
                            "start": 0,
                            "end": 0,
                          },
                        },
                      ],
                      "stats": {
                        "additions": 0,
                        "deletions": 1,
                      },
                      "eof": "noneMissing",
                    },
                    "old": {
                      "oid": "82eb77880c693655bce074e3dbbd9fa711dc018b",
                      "mode": "blob",
                    },
                  },
                  {
                    "status": "added",
                    "path": "README",
                    "diff": {
                      "type": "plain",
                      "hunks": [
                        {
                          "header": "@@ -0,0 +1 @@\n",
                          "lines": [
                            {
                              "line": "Hello World!\n",
                              "lineNo": 1,
                              "type": "addition",
                            },
                          ],
                          "old":  {
                            "start": 0,
                            "end": 0,
                          },
                          "new": {
                            "start": 1,
                            "end": 2,
                          },
                        },
                      ],
                      "stats": {
                        "additions": 1,
                        "deletions": 0,
                      },
                      "eof": "noneMissing",
                    },
                    "new": {
                      "oid": "980a0d5f19a64b4b30a87d4206aade58726b60e3",
                      "mode": "blob",
                    },
                  },
                  {
                    "status": "added",
                    "path": "dir1/README",
                    "diff": {
                      "type": "plain",
                      "hunks": [
                        {
                          "header": "@@ -0,0 +1 @@\n",
                          "lines": [
                            {
                              "line": "Hello World from dir1!\n",
                              "lineNo": 1,
                              "type": "addition"
                            }
                          ],
                          "old":  {
                            "start": 0,
                            "end": 0,
                          },
                          "new": {
                            "start": 1,
                            "end": 2,
                          },
                        }
                      ],
                      "stats": {
                        "additions": 1,
                        "deletions": 0,
                      },
                      "eof": "noneMissing",
                    },
                    "new": {
                      "oid": "1dd5654ca2d2cf9f33b14c92b5ca9e1d21a91ae1",
                      "mode": "blob",
                    },
                  },
                ],
                "stats": {
                  "filesChanged": 3,
                  "insertions": 2,
                  "deletions": 1
                }
              },
              "files": {
                "1dd5654ca2d2cf9f33b14c92b5ca9e1d21a91ae1": {
                  "id": "1dd5654ca2d2cf9f33b14c92b5ca9e1d21a91ae1",
                  "binary": false,
                  "content": "Hello World from dir1!\n",
                },
                "82eb77880c693655bce074e3dbbd9fa711dc018b": {
                  "id": "82eb77880c693655bce074e3dbbd9fa711dc018b",
                  "binary": false,
                  "content": "Thank you very much!\n",
                },
                "980a0d5f19a64b4b30a87d4206aade58726b60e3": {
                  "id": "980a0d5f19a64b4b30a87d4206aade58726b60e3",
                  "binary": false,
                  "content": "Hello World!\n",
                },
              },
              "branches": [
                "refs/heads/master"
              ]
            })
        );
    }

    #[tokio::test]
    async fn test_repos_commits_not_found() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(
            &app,
            format!("/repos/{RID}/commits/ffffffffffffffffffffffffffffffffffffffff"),
        )
        .await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_repos_stats() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/stats/tree/{HEAD}")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!(
              {
                "commits": 3,
                "branches": 1,
                "contributors": 1
              }
            )
        );
    }

    #[tokio::test]
    async fn test_repos_tree() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/tree/{HEAD}/")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "entries": [
                  {
                    "path": "dir1",
                    "oid": "2d1c3cbfcf1d190d7fc77ac8f9e53db0e91a9ad3",
                    "name": "dir1",
                    "kind": "tree"
                  },
                  {
                    "path": "README",
                    "oid": "980a0d5f19a64b4b30a87d4206aade58726b60e3",
                    "name": "README",
                    "kind": "blob"
                  }
                ],
                "lastCommit": {
                  "id": HEAD,
                  "author": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz"
                  },
                  "summary": "Add another folder",
                  "description": "",
                  "parents": [
                    "ee8d6a29304623a78ebfa5eeed5af674d0e58f83",
                  ],
                  "committer": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz",
                    "time": 1673003014
                  },
                },
                "name": "",
                "path": "",
              }
            )
        );

        let response = get(&app, format!("/repos/{RID}/tree/{HEAD}/dir1")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
              "entries": [
                {
                  "path": "dir1/README",
                  "oid": "1dd5654ca2d2cf9f33b14c92b5ca9e1d21a91ae1",
                  "name": "README",
                  "kind": "blob"
                }
              ],
              "lastCommit": {
                "id": HEAD,
                "author": {
                  "name": "Alice Liddell",
                  "email": "alice@radicle.xyz"
                },
                "summary": "Add another folder",
                "description": "",
                "parents": [
                  "ee8d6a29304623a78ebfa5eeed5af674d0e58f83",
                ],
                "committer": {
                  "name": "Alice Liddell",
                  "email": "alice@radicle.xyz",
                  "time": 1673003014
                },
              },
              "name": "dir1",
              "path": "dir1",
            })
        );
    }

    #[tokio::test]
    async fn test_repos_tree_not_found() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(
            &app,
            format!("/repos/{RID}/tree/ffffffffffffffffffffffffffffffffffffffff"),
        )
        .await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let response = get(&app, format!("/repos/{RID}/tree/{HEAD}/unknown")).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_repos_remotes_root() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/remotes")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
              {
                "id": "z6MknSLrJoTcukLrE435hVNQT4JUhbvWLX4kUzqkEStBU8Vi",
                "alias": CONTRIBUTOR_ALIAS,
                "heads": {
                  "master": HEAD
                },
                "delegate": true
              }
            ])
        );
    }

    #[tokio::test]
    async fn test_repos_remotes() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(
            &app,
            format!("/repos/{RID}/remotes/z6MknSLrJoTcukLrE435hVNQT4JUhbvWLX4kUzqkEStBU8Vi"),
        )
        .await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "id": "z6MknSLrJoTcukLrE435hVNQT4JUhbvWLX4kUzqkEStBU8Vi",
                "heads": {
                    "master": HEAD
                },
                "delegate": true
            })
        );
    }

    #[tokio::test]
    async fn test_repos_remotes_not_found() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(
            &app,
            format!("/repos/{RID}/remotes/z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT"),
        )
        .await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_repos_blob() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/blob/{HEAD}/README")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "binary": false,
                "name": "README",
                "path": "README",
                "lastCommit": {
                  "id": HEAD,
                  "author": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz"
                  },
                  "summary": "Add another folder",
                  "description": "",
                  "parents": [
                    "ee8d6a29304623a78ebfa5eeed5af674d0e58f83"
                  ],
                  "committer": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz",
                    "time": 1673003014
                  },
                },
                "content": "Hello World!\n",
            })
        );
    }

    #[tokio::test]
    async fn test_repos_blob_not_found() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/blob/{HEAD}/unknown")).await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_repos_readme() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/readme/{INITIAL_COMMIT}")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "binary": false,
                "name": "README",
                "path": "README",
                "lastCommit": {
                  "id": INITIAL_COMMIT,
                  "author": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz"
                  },
                  "summary": "Initial commit",
                  "description": "",
                  "parents": [],
                  "committer": {
                    "name": "Alice Liddell",
                    "email": "alice@radicle.xyz",
                    "time": 1673001014
                  },
                },
                "content": "Hello World!\n"
            })
        );
    }

    #[tokio::test]
    async fn test_repos_diff() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/diff/{INITIAL_COMMIT}/{HEAD}")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "diff": {
                  "files": [
                    {
                      "status": "added",
                      "path": "dir1/README",
                      "diff": {
                        "type": "plain",
                        "hunks": [
                          {
                            "header": "@@ -0,0 +1 @@\n",
                            "lines": [
                              {
                                "line": "Hello World from dir1!\n",
                                "lineNo": 1,
                                "type": "addition",
                              },
                            ],
                            "old":  {
                              "start": 0,
                              "end": 0,
                            },
                            "new": {
                              "start": 1,
                              "end": 2,
                            },
                          },
                        ],
                        "stats": {
                          "additions": 1,
                          "deletions": 0,
                        },
                        "eof": "noneMissing",
                      },
                      "new": {
                        "oid": "1dd5654ca2d2cf9f33b14c92b5ca9e1d21a91ae1",
                        "mode": "blob",
                      },
                    },
                  ],
                  "stats": {
                    "filesChanged": 1,
                    "insertions": 1,
                    "deletions": 0,
                  },
                },
                "files": {
                  "1dd5654ca2d2cf9f33b14c92b5ca9e1d21a91ae1": {
                    "id": "1dd5654ca2d2cf9f33b14c92b5ca9e1d21a91ae1",
                    "binary": false,
                    "content": "Hello World from dir1!\n",
                  },
                },
                "commits": [
                  {
                    "id": HEAD,
                    "author": {
                      "name": "Alice Liddell",
                      "email": "alice@radicle.xyz",
                    },
                    "summary": "Add another folder",
                    "description": "",
                    "parents": [
                      "ee8d6a29304623a78ebfa5eeed5af674d0e58f83"
                    ],
                    "committer": {
                      "name": "Alice Liddell",
                      "email": "alice@radicle.xyz",
                      "time": 1673003014,
                    },
                  },
                  {
                    "id": PARENT,
                    "author": {
                      "name": "Alice Liddell",
                      "email": "alice@radicle.xyz",
                    },
                    "summary": "Add contributing file",
                    "description": "",
                    "parents": [
                      "f604ce9fd5b7cc77b7609beda45ea8760bee78f7",
                    ],
                    "committer": {
                      "name": "Alice Liddell",
                      "email": "alice@radicle.xyz",
                      "time": 1673002014,
                    }
                  }
                ],
            })
        );
    }

    #[tokio::test]
    async fn test_repos_issues_root() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/issues")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
              {
                "id": ISSUE_ID,
                "author": {
                  "id": DID,
                  "alias": CONTRIBUTOR_ALIAS
                },
                "title": "Issue #1",
                "state": {
                  "status": "open"
                },
                "assignees": [],
                "discussion": [
                  {
                    "id": ISSUE_ID,
                    "author": {
                      "id": DID,
                      "alias": CONTRIBUTOR_ALIAS
                    },
                    "body": "Change 'hello world' to 'hello everyone'",
                    "edits": [
                      {
                        "author": {
                          "id": DID,
                          "alias": CONTRIBUTOR_ALIAS
                        },
                        "body": "Change 'hello world' to 'hello everyone'",
                        "timestamp": TIMESTAMP,
                        "embeds": [],
                      },
                    ],
                    "embeds": [],
                    "reactions": [],
                    "timestamp": TIMESTAMP,
                    "replyTo": null,
                    "resolved": false,
                  }
                ],
                "labels": []
              }
            ])
        );
    }

    #[tokio::test]
    async fn test_repos_issue() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/issues/{ISSUE_ID}")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "id": ISSUE_ID,
                "author": {
                  "id": DID,
                  "alias": CONTRIBUTOR_ALIAS
                },
                "title": "Issue #1",
                "state": {
                  "status": "open"
                },
                "assignees": [],
                "discussion": [
                  {
                    "id": ISSUE_ID,
                    "author": {
                      "id": DID,
                      "alias": CONTRIBUTOR_ALIAS
                    },
                    "body": "Change 'hello world' to 'hello everyone'",
                    "edits": [
                      {
                        "author": {
                          "id": DID,
                          "alias": CONTRIBUTOR_ALIAS
                        },
                        "body": "Change 'hello world' to 'hello everyone'",
                        "timestamp": TIMESTAMP,
                        "embeds": [],
                      },
                    ],
                    "embeds": [],
                    "reactions": [],
                    "timestamp": TIMESTAMP,
                    "replyTo": null,
                    "resolved": false,
                  }
                ],
                "labels": []
            })
        );
    }

    #[tokio::test]
    async fn test_repos_patches_root() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/patches")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!([
                {
                    "id": PATCH_ID,
                    "author": {
                        "id": DID,
                        "alias": CONTRIBUTOR_ALIAS,
                    },
                    "title": "A new `hello world`",
                    "state": {
                        "status": "open",
                    },
                    "target": "delegates",
                    "labels": [],
                    "merges": [],
                    "assignees": [],
                    "revisions": [
                        {
                            "id": PATCH_ID,
                            "author": {
                                "id": DID,
                                "alias": CONTRIBUTOR_ALIAS,
                            },
                            "description": "change `hello world` in README to something else",
                            "edits": [
                                {
                                    "author": {
                                        "id": DID,
                                        "alias": CONTRIBUTOR_ALIAS,
                                    },
                                    "body": "change `hello world` in README to something else",
                                    "timestamp": TIMESTAMP,
                                    "embeds": [],
                                },
                            ],
                            "reactions": [],
                            "base": "ee8d6a29304623a78ebfa5eeed5af674d0e58f83",
                            "oid": "e8c676b9e3b42308dc9d218b70faa5408f8e58ca",
                            "refs": [
                                "refs/heads/master",
                            ],
                            "discussions": [],
                            "timestamp": TIMESTAMP,
                            "reviews": [],
                        },
                    ],
                },
                ]
            )
        );
    }

    #[tokio::test]
    async fn test_repos_patch() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/patches/{PATCH_ID}")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.json().await,
            json!({
                "id": PATCH_ID,
                "author": {
                    "id": DID,
                    "alias": CONTRIBUTOR_ALIAS,
                },
                "title": "A new `hello world`",
                "state": {
                    "status": "open",
                },
                "target": "delegates",
                "labels": [],
                "merges": [],
                "assignees": [],
                "revisions": [
                    {
                        "id": PATCH_ID,
                        "author": {
                            "id": DID,
                            "alias": CONTRIBUTOR_ALIAS,
                        },
                        "description": "change `hello world` in README to something else",
                        "edits": [
                            {
                                "author": {
                                    "id": DID,
                                    "alias": CONTRIBUTOR_ALIAS,
                                },
                                "body": "change `hello world` in README to something else",
                                "timestamp": TIMESTAMP,
                                "embeds": [],
                            },
                        ],
                        "reactions": [],
                        "base": "ee8d6a29304623a78ebfa5eeed5af674d0e58f83",
                        "oid": "e8c676b9e3b42308dc9d218b70faa5408f8e58ca",
                        "refs": [
                            "refs/heads/master",
                        ],
                        "discussions": [],
                        "timestamp": TIMESTAMP,
                        "reviews": [],
                    },
                ],
            })
        );
    }

    #[tokio::test]
    async fn test_repos_private() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = seed(tmp.path());
        let app = super::router(ctx.to_owned());

        // Check that the repo exists.
        ctx.profile()
            .storage
            .repository(RID_PRIVATE.parse().unwrap())
            .unwrap();

        let response = get(&app, format!("/repos/{RID_PRIVATE}")).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let response = get(&app, format!("/repos/{RID_PRIVATE}/patches")).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let response = get(&app, format!("/repos/{RID_PRIVATE}/issues")).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let response = get(&app, format!("/repos/{RID_PRIVATE}/commits")).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let response = get(&app, format!("/repos/{RID_PRIVATE}/remotes")).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_repos_uses_reloadable_pinned_config() {
        use radicle::identity::RepoId;
        use std::str::FromStr;

        let tmp = tempfile::tempdir().unwrap();
        let seed = seed(tmp.path());

        let app = super::router(seed.clone())
            .layer(MockConnectInfo(SocketAddr::from(([127, 0, 0, 1], 8080))));
        let response = get(&app, "/repos?show=pinned").await;
        assert_eq!(response.status(), StatusCode::OK);
        let repos = response.json().await;
        assert_eq!(repos.as_array().unwrap().len(), 0);

        {
            let rid = RepoId::from_str(RID).unwrap();
            seed.web_config
                .update(|config| {
                    config.pinned.repositories.insert(rid);
                })
                .await;
        }

        let response = get(&app, "/repos?show=pinned").await;
        assert_eq!(response.status(), StatusCode::OK);
        let repos = response.json().await;
        assert_eq!(repos.as_array().unwrap().len(), 1);
        assert_eq!(repos[0]["rid"], json!(RID));
    }
}
