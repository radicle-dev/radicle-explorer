use std::collections::{HashMap, HashSet};
use std::str::FromStr;

use axum::extract::State;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};

use radicle::cob::cache::{Error as CacheError, COBS_DB_FILE};
use radicle::cob::ObjectId;
use radicle::git;
use radicle::identity::{Did, RepoId};
use radicle::patch::cache::Patches as _;
use radicle::storage::ReadStorage;
use sqlite as sql;

use crate::api::error::Error;
use crate::api::query::MAX_PER_PAGE;
use crate::api::{repo, Context};
use crate::axum_extra::{cached_response, Path, Query};

/// How long a profile response may be cached. The query behind all three
/// endpoints scans the whole COB cache, so a node serving the same profile to
/// many viewers benefits from not repeating it per view. A few minutes is
/// short enough that a newly opened patch or issue shows up on its author's
/// profile while they are still looking at it.
const CACHE_MAX_AGE: u64 = 300;

/// Number of activity items returned when the caller does not say.
const DEFAULT_ACTIVITY_LIMIT: usize = 50;
/// Upper bound on a caller-supplied activity `limit`.
const MAX_ACTIVITY_LIMIT: usize = 500;

/// Span of the contribution calendar when the caller does not say.
const DEFAULT_CALENDAR_DAYS: u32 = 365;
/// Upper bound on a caller-supplied calendar `days`. Ten years, so a caller
/// offering a year picker can ask for every year a person has been active in
/// one request. The span only trims the response: the query behind it reads the
/// same rows either way, and the response holds one entry per active day.
const MAX_CALENDAR_DAYS: u32 = 3650;

/// How long to wait for the COB cache lock before failing a read. Matches
/// `radicle`'s own read timeout on the same database.
const DB_READ_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(3);

pub fn router(ctx: Context) -> Router {
    Router::new()
        .route("/users/{did}/repos", get(user_repos_handler))
        .route("/users/{did}/activity", get(user_activity_handler))
        .route(
            "/users/{did}/contributions",
            get(user_contributions_handler),
        )
        .with_state(ctx)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserReposQuery {
    pub page: Option<usize>,
    pub per_page: Option<usize>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityQuery {
    pub limit: Option<usize>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarQuery {
    pub days: Option<u32>,
}

/// What kind of thing an activity item records. `Revision` is a follow-up
/// revision pushed to an existing patch, which is distinct from opening the
/// patch in the first place.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
enum ActivityKind {
    Patch,
    Revision,
    Issue,
}

/// Something a person contributed, for the cross-repo activity feed.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivityItem {
    rid: RepoId,
    kind: ActivityKind,
    /// The COB to open: the patch or issue id. A revision item carries the id
    /// of the patch it belongs to, since revisions are not addressable on
    /// their own.
    id: String,
    /// Set only on revision items, and only to keep them distinct from each
    /// other and from their patch.
    #[serde(skip_serializing_if = "Option::is_none")]
    revision_id: Option<String>,
    /// 1-based position of this revision among its patch's revisions, and how
    /// many there are. Filled in from the patch itself rather than the cache,
    /// see [`annotate_revision_positions`].
    #[serde(skip_serializing_if = "Option::is_none")]
    revision_position: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    revision_total: Option<usize>,
    title: String,
    status: String,
    /// Unix seconds, like every other timestamp in this API.
    timestamp: i64,
}

/// A repo a person has some relationship to, with what they did there.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserRepo {
    #[serde(flatten)]
    repo: repo::Info,
    /// Whether they are a delegate of this repo.
    is_delegate: bool,
    patches_authored: usize,
    issues_authored: usize,
    /// When they last contributed here, in unix seconds. Unset if they never
    /// have, which is the case for a repo they only delegate.
    #[serde(skip_serializing_if = "Option::is_none")]
    last_contribution: Option<i64>,
}

/// One day's contribution count, for the calendar heatmap. Days with no
/// contributions are omitted; the caller fills the grid.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ContributionDay {
    /// `YYYY-MM-DD`, bucketed in UTC so the same profile renders identically
    /// wherever it is opened.
    date: String,
    count: usize,
}

/// Every patch, follow-up revision and issue a DID opened, as one row set.
/// Shared by all three endpoints so they can never disagree about what counts
/// as a contribution. `?1` is the author's DID, `?2` the same author's bare
/// node id: a patch stores its author as a full DID, while an issue stores the
/// node id on its thread's root comment.
const AUTHORED_ACTIVITY: &str = r#"
    SELECT 'patch' AS kind,
           p.id AS id,
           NULL AS revision_id,
           JSON_EXTRACT(p.patch, '$.title') AS title,
           JSON_EXTRACT(p.patch, '$.state.status') AS status,
           (SELECT JSON_EXTRACT(revision.value, '$.timestamp')
              FROM JSON_EACH(JSON_EXTRACT(p.patch, '$.revisions')) AS revision
             WHERE JSON_EXTRACT(revision.value, '$.id') = p.id
           ) AS timestamp,
           p.repo AS repo
      FROM patches AS p
     WHERE JSON_EXTRACT(p.patch, '$.author.id') = ?1
    UNION ALL
    -- Follow-up revisions only. A patch's initial revision carries the patch's
    -- own id, and the branch above already reports it as the patch being
    -- opened. Identifying it that way rather than by earliest timestamp is
    -- deliberate: revision timestamps are supplied by whoever authored them,
    -- so a peer with a skewed clock would otherwise push the real initial
    -- revision out of first place.
    SELECT 'revision',
           p.id,
           JSON_EXTRACT(revision.value, '$.id'),
           JSON_EXTRACT(p.patch, '$.title'),
           JSON_EXTRACT(p.patch, '$.state.status'),
           JSON_EXTRACT(revision.value, '$.timestamp'),
           p.repo
      FROM patches AS p,
           JSON_EACH(JSON_EXTRACT(p.patch, '$.revisions')) AS revision
     WHERE JSON_EXTRACT(revision.value, '$.author.id') = ?1
       AND JSON_EXTRACT(revision.value, '$.id') <> p.id
    UNION ALL
    SELECT 'issue',
           i.id,
           NULL,
           JSON_EXTRACT(i.issue, '$.title'),
           JSON_EXTRACT(i.issue, '$.state.status'),
           (SELECT JSON_EXTRACT(comment.value, '$.edits[0].timestamp')
              FROM JSON_EACH(JSON_EXTRACT(i.issue, '$.thread.comments')) AS comment
             WHERE JSON_EXTRACT(comment.value, '$.replyTo') IS NULL
               AND JSON_EXTRACT(comment.value, '$.author') = ?2
             LIMIT 1
           ),
           i.repo
      FROM issues AS i
     WHERE EXISTS (
           SELECT 1
             FROM JSON_EACH(JSON_EXTRACT(i.issue, '$.thread.comments')) AS comment
            WHERE JSON_EXTRACT(comment.value, '$.replyTo') IS NULL
              AND JSON_EXTRACT(comment.value, '$.author') = ?2
           )
"#;

/// One row of [`AUTHORED_ACTIVITY`].
struct Authored {
    rid: RepoId,
    kind: ActivityKind,
    id: String,
    revision_id: Option<String>,
    title: String,
    status: String,
    /// Unix seconds. `None` when the cache holds no timestamp for the row,
    /// which happens for a patch whose initial revision is missing.
    timestamp: Option<i64>,
}

/// Open the COB cache read-only.
///
/// Opened directly rather than through [`radicle::profile::Profile::cobs_db`],
/// whose handle does not expose its connection: these endpoints need one
/// cross-repo query, not a walk of every repo's COBs. Read-only, so a node
/// writing the same database is never blocked by a page view.
fn cobs_db(ctx: &Context) -> Result<sql::ConnectionThreadSafe, CacheError> {
    let mut db = sql::Connection::open_thread_safe_with_flags(
        ctx.profile.cobs().join(COBS_DB_FILE),
        sql::OpenFlags::new().with_read_only(),
    )?;
    db.set_busy_timeout(DB_READ_TIMEOUT.as_millis() as usize)?;

    Ok(db)
}

/// Run [`AUTHORED_ACTIVITY`] for `did`, newest first.
///
/// The whole row set is returned rather than aggregated in SQL, because every
/// caller has to drop the rows belonging to private repos before counting, and
/// a person's lifetime of patches and issues is small next to the scan that
/// produced it.
fn authored_activity(ctx: &Context, did: &Did) -> Result<Vec<Authored>, CacheError> {
    let db = cobs_db(ctx)?;
    let mut stmt = db.prepare(format!(
        "SELECT kind, id, revision_id, title, status, timestamp, repo
         FROM ({AUTHORED_ACTIVITY})
         ORDER BY timestamp DESC, id DESC;"
    ))?;
    stmt.bind((1, did.to_string().as_str()))?;
    stmt.bind((2, did.as_key().to_string().as_str()))?;

    Ok(stmt
        .into_iter()
        .filter_map(|row| {
            let row = row.ok()?;
            let kind = match row.read::<&str, _>("kind") {
                "patch" => ActivityKind::Patch,
                "revision" => ActivityKind::Revision,
                "issue" => ActivityKind::Issue,
                _ => return None,
            };

            Some(Authored {
                rid: RepoId::from_str(row.read::<&str, _>("repo")).ok()?,
                kind,
                id: row.read::<&str, _>("id").to_string(),
                revision_id: row
                    .read::<Option<&str>, _>("revision_id")
                    .map(str::to_string),
                title: row.read::<&str, _>("title").to_string(),
                status: row.read::<&str, _>("status").to_string(),
                // Cached COB timestamps are milliseconds; this API is in
                // seconds throughout.
                timestamp: row.read::<Option<i64>, _>("timestamp").map(|ms| ms / 1000),
            })
        })
        .collect::<Vec<_>>())
}

/// The public repos in local storage, as a lookup set.
///
/// Every endpoint here reports across repos, so it has to answer "may this
/// viewer see it at all" per row. A repo that is private, or that the cache
/// still knows but storage no longer holds, is dropped.
#[allow(clippy::result_large_err)]
fn public_repos(ctx: &Context) -> Result<HashSet<RepoId>, Error> {
    Ok(ctx
        .profile
        .storage
        .repositories()?
        .into_iter()
        .filter(|repo| repo.doc.visibility().is_public())
        .map(|repo| repo.rid)
        .collect())
}

/// Fill in `revision_position` / `revision_total` on revision items.
///
/// Numbering comes from `patch.revisions()`, the same delivered order the patch
/// page counts by, so the two views can never disagree about which revision is
/// which. It deliberately does not come from the COB cache: that stores a
/// patch's revisions as a JSON object keyed by revision id, so the only order
/// recoverable there is lexicographic, and ordering by timestamp would let a
/// peer with a skewed clock renumber everyone's revisions.
///
/// One lookup per distinct patch, not per item: a patch with many revisions is
/// exactly the case that puts several rows in one feed page.
fn annotate_revision_positions(ctx: &Context, items: &mut [ActivityItem]) {
    // (repo, patch) -> revision id -> (position, total)
    let mut positions: HashMap<(RepoId, String), HashMap<String, (usize, usize)>> = HashMap::new();

    for item in items.iter() {
        if item.kind != ActivityKind::Revision {
            continue;
        }
        let key = (item.rid, item.id.clone());
        if positions.contains_key(&key) {
            continue;
        }

        let mut found = HashMap::new();
        if let Ok(oid) = item.id.parse::<git::Oid>() {
            if let Ok(repo) = ctx.profile.storage.repository(item.rid) {
                if let Ok(patches) = ctx.profile.patches(&repo) {
                    if let Ok(Some(patch)) = patches.get(&ObjectId::from(oid)) {
                        let ordered = patch.revisions().map(|(id, _)| id).collect::<Vec<_>>();
                        let total = ordered.len();
                        for (index, id) in ordered.into_iter().enumerate() {
                            found.insert(id.to_string(), (index + 1, total));
                        }
                    }
                }
            }
        }
        positions.insert(key, found);
    }

    for item in items.iter_mut() {
        if item.kind != ActivityKind::Revision {
            continue;
        }
        let Some(revision_id) = item.revision_id.as_deref() else {
            continue;
        };
        if let Some((position, total)) = positions
            .get(&(item.rid, item.id.clone()))
            .and_then(|found| found.get(revision_id))
        {
            item.revision_position = Some(*position);
            item.revision_total = Some(*total);
        }
    }
}

/// List the repos a user delegates or has contributed to, most recently
/// contributed to first.
/// `GET /users/:did/repos`
async fn user_repos_handler(
    State(ctx): State<Context>,
    Path(did): Path<Did>,
    Query(qs): Query<UserReposQuery>,
) -> impl IntoResponse {
    let UserReposQuery { page, per_page } = qs;
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(10).min(MAX_PER_PAGE);

    let repos = crate::api::blocking(move || {
        // Per-repo counts exclude follow-up revisions, which are not a separate
        // patch or issue, but `last_contribution` includes them: pushing a
        // revision is still touching the repo.
        let mut counts: HashMap<RepoId, (usize, usize, Option<i64>)> = HashMap::new();
        for row in authored_activity(&ctx, &did)? {
            let entry = counts.entry(row.rid).or_insert((0, 0, None));
            match row.kind {
                ActivityKind::Patch => entry.0 += 1,
                ActivityKind::Issue => entry.1 += 1,
                ActivityKind::Revision => {}
            }
            entry.2 = entry.2.max(row.timestamp);
        }

        // A repo belongs on the profile when the user delegates it or has
        // opened something in it. Storage is walked once for both halves, which
        // also drops anything the cache knows but storage does not hold.
        let mut rows = ctx
            .profile
            .storage
            .repositories()?
            .into_iter()
            .filter(|repo| repo.doc.visibility().is_public())
            .filter_map(|repo| {
                let is_delegate = repo.doc.delegates().iter().any(|d| *d == did);
                let contribution = counts.get(&repo.rid).copied();
                if !is_delegate && contribution.is_none() {
                    return None;
                }
                let (patches, issues, last) = contribution.unwrap_or((0, 0, None));

                Some((repo.rid, is_delegate, patches, issues, last))
            })
            .collect::<Vec<_>>();

        // Ordered by when this person last touched each repo. It is their
        // profile, so recency of their own contribution is the only ordering
        // that reads meaningfully here; a repo's own commit recency says
        // nothing about them. A delegated repo they never contributed to has no
        // such date, so it sorts last, by RID among its peers for a stable
        // order across pages.
        rows.sort_by(|a, b| b.4.cmp(&a.4).then_with(|| a.0.cmp(&b.0)));

        let repos = rows
            .into_iter()
            .skip(page * per_page)
            .take(per_page)
            .filter_map(|(rid, is_delegate, patches, issues, last)| {
                let (repo, doc) = ctx.repo(rid).ok()?;
                let info = ctx.repo_info(&repo, doc).ok()?;

                Some(UserRepo {
                    repo: info,
                    is_delegate,
                    patches_authored: patches,
                    issues_authored: issues,
                    last_contribution: last,
                })
            })
            .collect::<Vec<_>>();

        Ok::<_, Error>(repos)
    })
    .await?;

    Ok::<_, Error>(cached_response(repos, CACHE_MAX_AGE))
}

/// The patches, revisions and issues a user opened, across every public repo
/// this node holds, newest first.
/// `GET /users/:did/activity`
async fn user_activity_handler(
    State(ctx): State<Context>,
    Path(did): Path<Did>,
    Query(qs): Query<ActivityQuery>,
) -> impl IntoResponse {
    let limit = qs
        .limit
        .unwrap_or(DEFAULT_ACTIVITY_LIMIT)
        .min(MAX_ACTIVITY_LIMIT);

    let items = crate::api::blocking(move || {
        let public = public_repos(&ctx)?;
        let mut items = authored_activity(&ctx, &did)?
            .into_iter()
            .filter(|row| public.contains(&row.rid))
            .filter_map(|row| {
                Some(ActivityItem {
                    rid: row.rid,
                    kind: row.kind,
                    id: row.id,
                    revision_id: row.revision_id,
                    revision_position: None,
                    revision_total: None,
                    title: row.title,
                    status: row.status,
                    timestamp: row.timestamp?,
                })
            })
            .take(limit)
            .collect::<Vec<_>>();

        // Revision numbering is not in the cache; it comes from the patch.
        annotate_revision_positions(&ctx, &mut items);

        Ok::<_, Error>(items)
    })
    .await?;

    Ok::<_, Error>(cached_response(items, CACHE_MAX_AGE))
}

/// Daily contribution counts for a user over the last `days` days.
/// `GET /users/:did/contributions`
async fn user_contributions_handler(
    State(ctx): State<Context>,
    Path(did): Path<Did>,
    Query(qs): Query<CalendarQuery>,
) -> impl IntoResponse {
    let days = qs
        .days
        .unwrap_or(DEFAULT_CALENDAR_DAYS)
        .min(MAX_CALENDAR_DAYS);

    let calendar = crate::api::blocking(move || {
        let cutoff = chrono::Utc::now().timestamp() - i64::from(days) * 86_400;
        let public = public_repos(&ctx)?;

        // Bucketed in UTC so the same profile renders identically wherever it
        // is opened; a local-time bucket would shift items across day
        // boundaries per viewer.
        let mut counts: HashMap<String, usize> = HashMap::new();
        for row in authored_activity(&ctx, &did)? {
            if !public.contains(&row.rid) {
                continue;
            }
            let Some(timestamp) = row.timestamp.filter(|t| *t >= cutoff) else {
                continue;
            };
            let Some(date) = chrono::DateTime::from_timestamp(timestamp, 0) else {
                continue;
            };
            *counts
                .entry(date.format("%Y-%m-%d").to_string())
                .or_default() += 1;
        }

        let mut calendar = counts
            .into_iter()
            .map(|(date, count)| ContributionDay { date, count })
            .collect::<Vec<_>>();
        calendar.sort_by(|a, b| a.date.cmp(&b.date));

        Ok::<_, Error>(calendar)
    })
    .await?;

    Ok::<_, Error>(cached_response(calendar, CACHE_MAX_AGE))
}
