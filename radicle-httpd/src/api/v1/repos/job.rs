use axum::extract::State;
use axum::response::IntoResponse;
use axum::Json;
use serde::Serialize;
use url::Url;
use uuid::Uuid;

use radicle::git::Oid;
use radicle::identity::{Did, RepoId};
use radicle::node::{Alias, AliasStore};
use radicle_job::JobId;

use crate::api::error::Error as ApiError;
use crate::api::Context;
use crate::axum_extra::Path;

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    job_id: JobId,
    commit: Oid,
    runs: Vec<Run>,
}

impl Job {
    fn new(id: JobId, job: &radicle_job::Job, aliases: &impl AliasStore) -> Self {
        let runs = job
            .runs()
            .iter()
            .flat_map(|(node_id, runs)| {
                let did: Did = node_id.into();
                let alias = aliases.alias(&did);

                runs.iter().map(move |(run_id, run)| Run {
                    run_id: *run_id,
                    node: JobAuthor {
                        id: did,
                        alias: alias.clone(),
                    },
                    status: (*run.status()).into(),
                    log: run.log().clone(),
                })
            })
            .collect();

        Self {
            job_id: id,
            commit: *job.oid(),
            runs,
        }
    }
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct JobAuthor {
    id: Did,
    #[serde(skip_serializing_if = "Option::is_none")]
    alias: Option<Alias>,
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Run {
    run_id: Uuid,
    node: JobAuthor,
    status: Status,
    log: Url,
}

#[derive(Clone, Copy, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
enum Status {
    Started,
    Failed,
    Succeeded,
}

impl From<radicle_job::Status> for Status {
    fn from(value: radicle_job::Status) -> Self {
        match value {
            radicle_job::Status::Started => Self::Started,
            radicle_job::Status::Finished(radicle_job::Reason::Failed) => Self::Failed,
            radicle_job::Status::Finished(radicle_job::Reason::Succeeded) => Self::Succeeded,
        }
    }
}

pub trait FindJobs {
    fn find_by_commit(&self, oid: Oid) -> Result<Vec<(JobId, radicle_job::Job)>, ApiError>;

    fn jobs_by_commit<A: AliasStore>(
        &self,
        commit: Oid,
        aliases: &A,
    ) -> Result<Vec<Job>, ApiError> {
        let mut jobs: Vec<Job> = self
            .find_by_commit(commit)?
            .into_iter()
            .map(|(id, job)| Job::new(id, &job, aliases))
            .collect();
        jobs.sort_by_key(|job| job.job_id);

        Ok(jobs)
    }
}

pub struct JobsSource<'a> {
    ctx: &'a Context,
    rid: RepoId,
}

impl FindJobs for JobsSource<'_> {
    fn find_by_commit(&self, oid: Oid) -> Result<Vec<(JobId, radicle_job::Job)>, ApiError> {
        let (repo, _) = self.ctx.repo(self.rid)?;
        let store = radicle_job::Jobs::open(&repo)?;
        let iter = radicle_job::Jobs::find_by_commit(&store, oid)?;

        Ok(iter.collect::<Result<_, _>>()?)
    }
}

/// Get jobs for a commit.
/// `GET /repos/:rid/xyz.radworks.job/:sha`
pub async fn handler(
    State(ctx): State<Context>,
    Path((rid, sha)): Path<(RepoId, Oid)>,
) -> impl IntoResponse {
    let aliases = ctx.profile.aliases();
    let jobs = JobsSource { ctx: &ctx, rid }.jobs_by_commit(sha, &aliases)?;

    Ok::<_, ApiError>(Json(jobs))
}
