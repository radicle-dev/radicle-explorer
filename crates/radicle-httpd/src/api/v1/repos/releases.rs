use axum::extract::State;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::{json, Value};

use radicle::git::Oid;
use radicle::identity::doc::Delegates;
use radicle::identity::RepoId;
use radicle::node::AliasStore;
use radicle::storage::git::Repository;

use radicle_artifact::display::{CommitTitle, TagName};
use radicle_artifact::{cache_db_path, Artifact, Cid, Release, ReleaseId, Releases};

use crate::api::error::Error;
use crate::api::json::Author;
use crate::api::query::ReleasesQuery;
use crate::api::Context;
use crate::axum_extra::{Path, Query};

/// Default number of releases returned per page.
const DEFAULT_PER_PAGE: usize = 30;

/// Whether an artifact is hidden under the default (delegate-scoped) view.
///
/// Hidden when redacted by its author or a delegate (unless `show_redacted`),
/// or authored by a non-delegate (unless `all_authors`).
fn artifact_hidden(
    artifact: &Artifact,
    delegates: &Delegates,
    all_authors: bool,
    show_redacted: bool,
) -> bool {
    if !show_redacted {
        let redacted_by_trusted = artifact
            .redactions()
            .keys()
            .any(|did| did == artifact.author() || delegates.contains(did));
        if redacted_by_trusted {
            return true;
        }
    }
    !all_authors && !delegates.contains(artifact.author())
}

/// Serialize a single artifact. Locations are flattened across contributors
/// into `{ node, url }` entries; attestations are the attesting nodes;
/// redactions carry the flagging node and its reason.
fn artifact_json(cid: &Cid, artifact: &Artifact, aliases: &impl AliasStore) -> Value {
    let locations = artifact
        .locations()
        .iter()
        .flat_map(|(did, urls)| {
            urls.iter()
                .map(move |url| json!({ "node": Author::new(did).as_json(aliases), "url": url }))
        })
        .collect::<Vec<_>>();
    let attestations = artifact
        .attestations()
        .iter()
        .map(|did| Author::new(did).as_json(aliases))
        .collect::<Vec<_>>();
    let redactions = artifact
        .redactions()
        .iter()
        .map(|(did, reason)| json!({ "node": Author::new(did).as_json(aliases), "reason": reason }))
        .collect::<Vec<_>>();

    json!({
        "cid": cid.to_string(),
        "name": artifact.name(),
        "author": Author::new(artifact.author()).as_json(aliases),
        "locations": locations,
        "attestations": attestations,
        "redactions": redactions,
        "metadata": artifact.metadata(),
    })
}

/// Serialize a release. The COB has no title field: it is resolved from the
/// tag message when a tag is linked, otherwise the commit summary. When
/// `filter_artifacts` is set, artifacts hidden under the current view are
/// omitted; a release fetched by id shows all of them.
#[allow(clippy::too_many_arguments)]
fn release_json(
    id: ReleaseId,
    release: &Release,
    repo: &Repository,
    aliases: &impl AliasStore,
    delegates: &Delegates,
    all_authors: bool,
    show_redacted: bool,
    filter_artifacts: bool,
) -> Value {
    let title = release
        .tag()
        .and_then(|tag| repo.title(tag))
        .or_else(|| repo.title(release.oid()));
    let tag_name = release.tag().and_then(|tag| repo.tag_name(tag));

    let artifacts = release
        .artifacts()
        .iter()
        .filter(|(_, artifact)| {
            !filter_artifacts || !artifact_hidden(artifact, delegates, all_authors, show_redacted)
        })
        .map(|(cid, artifact)| artifact_json(cid, artifact, aliases))
        .collect::<Vec<_>>();

    json!({
        "id": id.to_string(),
        "oid": release.oid(),
        "tag": release.tag(),
        "tagName": tag_name,
        "title": title,
        "createdAt": release.timestamp().as_secs(),
        "creator": Author::new(release.creator()).as_json(aliases),
        "artifacts": artifacts,
    })
}

/// Get repo releases list, newest first.
/// `GET /repos/:rid/releases`
///
/// Scoped to releases created by a delegate and artifacts authored by a
/// delegate (hiding those redacted by a trusted party) unless widened with
/// `allAuthors=true` / `showRedacted=true`.
pub async fn list_handler(
    State(ctx): State<Context>,
    Path(rid): Path<RepoId>,
    Query(qs): Query<ReleasesQuery>,
) -> impl IntoResponse {
    let (repo, doc) = ctx.repo(rid)?;
    let delegates = doc.delegates();
    let aliases = ctx.profile.aliases();
    let ReleasesQuery {
        page,
        per_page,
        all_authors,
        show_redacted,
    } = qs;
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(DEFAULT_PER_PAGE);
    let all_authors = all_authors.unwrap_or(false);
    let show_redacted = show_redacted.unwrap_or(false);

    // Read through the SQLite cache; it self-warms on read and is shared with
    // other release reads on this node.
    let cache = cache_db_path(ctx.profile.cobs());
    let mut releases: Vec<_> = Releases::open_cached(&repo, cache)?
        .all()?
        .filter_map(|r| {
            let (id, release) = r.ok()?;
            (all_authors || delegates.contains(release.creator())).then_some((id, release))
        })
        .collect();
    releases.sort_by_key(|(_, release)| std::cmp::Reverse(release.timestamp()));

    let releases = releases
        .into_iter()
        .skip(page * per_page)
        .take(per_page)
        .map(|(id, release)| {
            release_json(
                ReleaseId::from(id),
                &release,
                &repo,
                &aliases,
                delegates,
                all_authors,
                show_redacted,
                true,
            )
        })
        .collect::<Vec<_>>();

    Ok::<_, Error>(Json(releases))
}

/// Get a single repo release by id, with all its artifacts.
/// `GET /repos/:rid/releases/:id`
pub async fn get_handler(
    State(ctx): State<Context>,
    Path((rid, release_id)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    let (repo, doc) = ctx.repo(rid)?;
    let delegates = doc.delegates();
    let aliases = ctx.profile.aliases();
    let cache = cache_db_path(ctx.profile.cobs());
    let release = Releases::open_cached(&repo, cache)?
        .get(&ReleaseId::from(release_id))?
        .ok_or(Error::NotFound)?;

    Ok::<_, Error>(Json(release_json(
        ReleaseId::from(release_id),
        &release,
        &repo,
        &aliases,
        delegates,
        true,
        true,
        false,
    )))
}

#[cfg(test)]
mod routes {
    use std::net::SocketAddr;
    use std::str::FromStr;

    use axum::extract::connect_info::MockConnectInfo;
    use axum::http::StatusCode;
    use axum::Router;
    use pretty_assertions::assert_eq;
    use serde_json::json;

    use radicle::git::Oid;
    use radicle::identity::RepoId;
    use radicle::node::device::Device;
    use radicle::storage::WriteStorage;

    use radicle_artifact::{Cid, Releases};
    use url::Url;

    use crate::api::Context;
    use crate::test::{get, seed, DID, HEAD, RID};

    /// A valid CIDv1 string; the release COB stores it verbatim.
    const CID: &str = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    const LOCATION: &str = "https://example.com/linux-amd64.tar.gz";

    /// The delegate signer seeded by `test::seed` (alias "seed").
    const DELEGATE_SEED: [u8; 32] = [0xff; 32];
    /// A signer that is not a delegate of the seeded repo.
    const NON_DELEGATE_SEED: [u8; 32] = [0xee; 32];

    fn app(ctx: Context) -> Router {
        super::super::router(ctx).layer(MockConnectInfo(SocketAddr::from(([127, 0, 0, 1], 8080))))
    }

    /// Create a release on the seeded repo at `HEAD`, signed by `seed`, with a
    /// single artifact and location. Returns the release id string.
    fn create_release(ctx: &Context, signer_seed: [u8; 32]) -> String {
        let signer = Device::mock_from_seed(signer_seed);
        let rid = RepoId::from_str(RID).unwrap();
        let repo = ctx.profile().storage.repository_mut(rid).unwrap();
        let oid = Oid::from_str(HEAD).unwrap();

        let mut releases = Releases::open(&repo).unwrap();
        let mut release = releases.create(oid, None, &signer).unwrap();
        let cid = Cid::from_str(CID).unwrap();
        release
            .register_artifact(cid, "linux-amd64".to_string(), &signer)
            .unwrap();
        release
            .add_location(cid, Url::parse(LOCATION).unwrap(), &signer)
            .unwrap();

        release.id().oid().to_string()
    }

    #[tokio::test]
    async fn test_repos_releases_empty() {
        let tmp = tempfile::tempdir().unwrap();
        let app = app(seed(tmp.path()));
        let response = get(&app, format!("/repos/{RID}/releases")).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.json().await, json!([]));
    }

    #[tokio::test]
    async fn test_repos_releases_list() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = seed(tmp.path());
        let id = create_release(&ctx, DELEGATE_SEED);
        let app = app(ctx);

        let response = get(&app, format!("/repos/{RID}/releases")).await;
        assert_eq!(response.status(), StatusCode::OK);

        // `createdAt` is stamped at COB-creation time, so drop it before
        // comparing against the fixed shape.
        let mut body = response.json().await;
        assert!(body[0]["createdAt"].as_u64().unwrap() > 0);
        body[0]["createdAt"].take();

        assert_eq!(
            body,
            json!([{
                "id": id,
                "oid": HEAD,
                "tag": null,
                "tagName": null,
                "title": "Add another folder",
                "createdAt": null,
                "creator": { "id": DID, "alias": "seed" },
                "artifacts": [{
                    "cid": CID,
                    "name": "linux-amd64",
                    "author": { "id": DID, "alias": "seed" },
                    "locations": [
                        { "node": { "id": DID, "alias": "seed" }, "url": LOCATION }
                    ],
                    "attestations": [],
                    "redactions": [],
                    "metadata": {},
                }],
            }])
        );
    }

    #[tokio::test]
    async fn test_repos_release_by_id() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = seed(tmp.path());
        let id = create_release(&ctx, DELEGATE_SEED);
        let app = app(ctx);

        let response = get(&app, format!("/repos/{RID}/releases/{id}")).await;
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.json().await;
        assert_eq!(body["id"], json!(id));
        assert_eq!(body["oid"], json!(HEAD));
        assert_eq!(body["title"], json!("Add another folder"));
        assert_eq!(body["artifacts"][0]["cid"], json!(CID));
    }

    #[tokio::test]
    async fn test_repos_release_not_found() {
        let tmp = tempfile::tempdir().unwrap();
        let app = app(seed(tmp.path()));
        let response = get(
            &app,
            format!("/repos/{RID}/releases/ffffffffffffffffffffffffffffffffffffffff"),
        )
        .await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_repos_releases_hides_non_delegate_creator() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = seed(tmp.path());
        create_release(&ctx, NON_DELEGATE_SEED);
        let app = app(ctx);

        // Default view is scoped to delegate creators.
        let response = get(&app, format!("/repos/{RID}/releases")).await;
        assert_eq!(response.json().await, json!([]));

        // `allAuthors=true` widens it to include non-delegate creators.
        let response = get(&app, format!("/repos/{RID}/releases?allAuthors=true")).await;
        let body = response.json().await;
        assert_eq!(body.as_array().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn test_repos_releases_hides_redacted_artifact() {
        let tmp = tempfile::tempdir().unwrap();
        let ctx = seed(tmp.path());

        // The delegate creates a release, then redacts its own artifact.
        {
            let signer = Device::mock_from_seed(DELEGATE_SEED);
            let rid = RepoId::from_str(RID).unwrap();
            let repo = ctx.profile().storage.repository_mut(rid).unwrap();
            let oid = Oid::from_str(HEAD).unwrap();
            let mut releases = Releases::open(&repo).unwrap();
            let mut release = releases.create(oid, None, &signer).unwrap();
            let cid = Cid::from_str(CID).unwrap();
            release
                .register_artifact(cid, "linux-amd64".to_string(), &signer)
                .unwrap();
            release
                .redact(cid, "bad build".to_string(), &signer)
                .unwrap();
        }
        let app = app(ctx);

        // Redacted by a trusted party, the artifact is hidden by default; the
        // release still lists, with an empty artifacts set.
        let response = get(&app, format!("/repos/{RID}/releases")).await;
        let body = response.json().await;
        assert_eq!(body[0]["artifacts"], json!([]));

        // `showRedacted=true` surfaces it, carrying the redaction reason.
        let response = get(&app, format!("/repos/{RID}/releases?showRedacted=true")).await;
        let body = response.json().await;
        assert_eq!(body[0]["artifacts"][0]["cid"], json!(CID));
        assert_eq!(
            body[0]["artifacts"][0]["redactions"][0]["reason"],
            json!("bad build")
        );
    }
}
