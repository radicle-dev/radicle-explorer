use axum::extract::path::ErrorKind;
use axum::extract::rejection::{PathRejection, QueryRejection};
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::{header, StatusCode};
use axum::response::IntoResponse;
use axum::Json;

use serde::de::DeserializeOwned;
use serde::Serialize;

pub struct Path<T>(pub T);

impl<S, T> FromRequestParts<S> for Path<T>
where
    T: DeserializeOwned + Send,
    S: Send + Sync,
{
    type Rejection = (StatusCode, axum::Json<Error>);

    async fn from_request_parts(req: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match axum::extract::Path::<T>::from_request_parts(req, state).await {
            Ok(value) => Ok(Self(value.0)),
            Err(rejection) => {
                let status = StatusCode::BAD_REQUEST;
                let body = match rejection {
                    PathRejection::FailedToDeserializePathParams(inner) => {
                        let kind = inner.into_kind();
                        match &kind {
                            ErrorKind::Message(msg) => Json(Error {
                                success: false,
                                error: msg.to_string(),
                            }),
                            _ => Json(Error {
                                success: false,
                                error: kind.to_string(),
                            }),
                        }
                    }
                    _ => Json(Error {
                        success: false,
                        error: format!("{rejection}"),
                    }),
                };

                Err((status, body))
            }
        }
    }
}

#[derive(Default)]
pub struct Query<T>(pub T);

impl<S, T> FromRequestParts<S> for Query<T>
where
    T: DeserializeOwned + Send,
    S: Send + Sync,
{
    type Rejection = (StatusCode, axum::Json<Error>);

    async fn from_request_parts(req: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match axum::extract::Query::<T>::from_request_parts(req, state).await {
            Ok(value) => Ok(Self(value.0)),
            Err(rejection) => {
                let status = StatusCode::BAD_REQUEST;
                let body = match rejection {
                    QueryRejection::FailedToDeserializeQueryString(inner) => Json(Error {
                        success: false,
                        error: inner.to_string(),
                    }),
                    _ => Json(Error {
                        success: false,
                        error: format!("{rejection}"),
                    }),
                };

                Err((status, body))
            }
        }
    }
}

#[derive(Serialize)]
pub struct Error {
    success: bool,
    error: String,
}

/// Cache-Control for content-addressed responses: fresh for 7 days, then
/// servable stale for a further day while a cache refreshes it or while the
/// node is failing. The content cannot change, so a stale copy is correct.
const IMMUTABLE_CACHE_CONTROL: &str =
    "public, max-age=604800, immutable, stale-while-revalidate=86400, stale-if-error=86400";

/// Cache-Control for responses where a slightly old answer is acceptable:
/// fresh for 2 minutes, then servable stale for a further 2 minutes while a
/// cache refreshes it, or for an hour while the node fails.
const STALE_CACHE_CONTROL: &str =
    "public, max-age=120, stale-while-revalidate=120, stale-if-error=3600";

/// How long a listing that changes as the node syncs stays fresh: node and
/// peer info, and repository search results.
pub const LISTING_TTL_IN_SECONDS: u64 = 600;

/// How long a repository's commit activity stays fresh. It is a histogram of
/// the whole history, so a new commit barely moves it.
pub const ACTIVITY_TTL_IN_SECONDS: u64 = 3600;

/// Add a Cache-Control header that marks the response as immutable and
/// instructs clients to cache the response for 7 days. Any cache in the chain
/// that supports the stale directives may also serve it for a further day
/// while it refreshes, or while the node is failing.
pub fn immutable_response(data: impl serde::Serialize) -> impl IntoResponse {
    (
        [(header::CACHE_CONTROL, IMMUTABLE_CACHE_CONTROL)],
        Json(data),
    )
}

/// Add a Cache-Control header that marks the response as must-revalidate and
/// instructs clients to cache the response for `max_age_seconds` .
pub fn cached_response(data: impl serde::Serialize, max_age_in_seconds: u64) -> impl IntoResponse {
    (
        [(
            header::CACHE_CONTROL,
            format!("public, max-age={max_age_in_seconds}, must-revalidate"),
        )],
        Json(data),
    )
}

/// Add a Cache-Control header that lets a cache serve a stale response while it
/// refreshes in the background, or while the node is failing.
///
/// Use this for responses where a slightly old answer is acceptable. Unlike
/// [`cached_response`], the response omits `must-revalidate`, which would
/// forbid serving stale. Unlike [`immutable_response`], clients can still force
/// a fresh copy with `Cache-Control: no-cache`.
pub fn stale_response(data: impl serde::Serialize) -> impl IntoResponse {
    ([(header::CACHE_CONTROL, STALE_CACHE_CONTROL)], Json(data))
}
