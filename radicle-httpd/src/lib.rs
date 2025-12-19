#![allow(clippy::type_complexity)]
#![allow(clippy::too_many_arguments)]
#![recursion_limit = "256"]
pub mod error;

use std::collections::HashMap;
use std::net::SocketAddr;
use std::num::NonZeroUsize;
use std::path::PathBuf;
use std::process::Command;
use std::str;
use std::sync::Arc;
use std::time::Duration;

use anyhow::Context as _;
use axum::body::{Body, HttpBody};
use axum::http::{Request, Response};
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{middleware, Json, Router};
use hyper::header::CONTENT_TYPE;
use hyper::Method;
use hyper_util::rt::TokioIo;
use hyper_util::service::TowerToHyperService;
use tokio::net::{TcpListener, UnixListener};
use tower::Service;
use tower_http::cors;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::Span;

use radicle::identity::RepoId;
use radicle::Profile;

use tracing_extra::{tracing_middleware, ColoredStatus, Paint, RequestId, TracingInfo};

use crate::api::RADICLE_VERSION;

mod api;
mod axum_extra;
mod cache;
mod git;
mod raw;
#[cfg(test)]
mod test;
mod tracing_extra;

/// Default cache HTTP size.
pub const DEFAULT_CACHE_SIZE: NonZeroUsize = NonZeroUsize::new(100).unwrap();

#[derive(Debug, Clone)]
pub enum ListenAddress {
    Tcp(SocketAddr),
    Unix(PathBuf),
}

impl std::fmt::Display for ListenAddress {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ListenAddress::Tcp(addr) => write!(f, "http://{}", addr),
            ListenAddress::Unix(path) => write!(f, "unix://{}", path.display()),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Options {
    pub aliases: HashMap<String, RepoId>,
    pub listen: ListenAddress,
    pub cache: Option<NonZeroUsize>,
}

/// Run the Server.
pub async fn run(options: Options) -> anyhow::Result<()> {
    let git_version = Command::new("git")
        .arg("version")
        .output()
        .context("'git' command must be available")?
        .stdout;

    tracing::info!("{}", str::from_utf8(&git_version)?.trim());

    match &options.listen {
        ListenAddress::Tcp(addr) => {
            let listener = TcpListener::bind(addr).await?;
            tracing::info!("listening on {}", options.listen);
            run_tcp_server(listener, options).await
        }
        ListenAddress::Unix(path) => {
            // Remove existing socket file if it exists
            if path.exists() {
                std::fs::remove_file(path)?;
            }
            let listener = UnixListener::bind(path)?;
            tracing::info!("listening on {}", options.listen);
            run_unix_server(listener, options).await
        }
    }
}

async fn run_tcp_server(listener: TcpListener, options: Options) -> anyhow::Result<()> {
    let profile = Profile::load()?;
    let request_id = RequestId::new();

    tracing::info!("using radicle home at {}", profile.home().path().display());

    let app =
        router(options, profile)?
        .layer(middleware::from_fn(tracing_middleware))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(move |_request: &Request<Body>| {
                    tracing::info_span!("request", id = %request_id.clone().next())
                })
                .on_response(
                    |response: &Response<Body>, latency: Duration, _span: &Span| {
                        if let Some(info) = response.extensions().get::<TracingInfo>() {
                            let client_addr = info.connect_info
                                .map(|ci| ci.0.to_string())
                                .unwrap_or_else(|| "unknown".to_string());
                            tracing::info!(
                                "{} \"{} {} {:?}\" {} {:?} {}",
                                client_addr,
                                info.method,
                                info.uri,
                                info.version,
                                ColoredStatus(response.status()),
                                latency,
                                Paint::dim(
                                    response
                                        .body()
                                        .size_hint()
                                        .exact()
                                        .map(|n| n.to_string())
                                        .unwrap_or("0".to_string())
                                        .into()
                                ),
                            );
                        } else {
                            tracing::info!("Processed");
                        }
                    },
                ),
        )
        .into_make_service_with_connect_info::<SocketAddr>();

    axum::serve(listener, app)
        .await
        .map_err(anyhow::Error::from)
}

async fn run_unix_server(listener: UnixListener, options: Options) -> anyhow::Result<()> {
    let profile = Profile::load()?;
    let request_id = RequestId::new();

    tracing::info!("using radicle home at {}", profile.home().path().display());

    let app =
        router(options, profile)?
        .layer(middleware::from_fn(tracing_middleware))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(move |_request: &Request<Body>| {
                    tracing::info_span!("request", id = %request_id.clone().next())
                })
                .on_response(
                    |response: &Response<Body>, latency: Duration, _span: &Span| {
                        tracing::info!(
                            "unix-socket \"{} {} {:?}\" {} {:?} {}",
                            response.extensions().get::<TracingInfo>()
                                .map(|info| info.method.as_str())
                                .unwrap_or("UNKNOWN"),
                            response.extensions().get::<TracingInfo>()
                                .map(|info| info.uri.path())
                                .unwrap_or("/"),
                            response.extensions().get::<TracingInfo>()
                                .map(|info| info.version)
                                .unwrap_or(hyper::Version::HTTP_11),
                            ColoredStatus(response.status()),
                            latency,
                            Paint::dim(
                                response
                                    .body()
                                    .size_hint()
                                    .exact()
                                    .map(|n| n.to_string())
                                    .unwrap_or("0".to_string())
                                    .into()
                            ),
                        );
                    },
                ),
        )
        .into_make_service();

    // Manual Unix socket serving since axum doesn't directly support Unix listeners
    loop {
        let (stream, _) = listener.accept().await?;
        let mut app_service = app.clone();

        tokio::spawn(async move {
            let stream = TokioIo::new(stream);

            // Create a service from the service factory for this connection
            match app_service.call(()).await {
                Ok(service) => {
                    let hyper_service = TowerToHyperService::new(service);
                    if let Err(err) = hyper::server::conn::http1::Builder::new()
                        .serve_connection(stream, hyper_service)
                        .await
                    {
                        tracing::error!("Error serving Unix socket connection: {}", err);
                    }
                }
                Err(err) => {
                    tracing::error!("Failed to create service: {:?}", err);
                }
            }
        });
    }
}

/// Create a router consisting of other sub-routers.
fn router(options: Options, profile: Profile) -> anyhow::Result<Router> {
    let profile = Arc::new(profile);
    let ctx = api::Context::new(profile.clone(), &options);

    let api_router = api::router(ctx);
    let git_router = git::router(profile.clone(), options.aliases);
    let raw_router = raw::router(profile);

    let app = Router::new()
        .route("/", get(root_index_handler))
        .merge(git_router)
        .nest("/api", api_router)
        .nest("/raw", raw_router)
        .layer(
            CorsLayer::new()
                .max_age(Duration::from_secs(86400))
                .allow_origin(cors::Any)
                .allow_methods([Method::GET])
                .allow_headers([CONTENT_TYPE]),
        );

    Ok(app)
}

async fn root_index_handler() -> impl IntoResponse {
    let response = serde_json::json!({
        "welcome": "Welcome to the radicle-httpd JSON API, this service doesn't serve the Radicle Explorer web client.",
        "version": format!("{}-{}", RADICLE_VERSION, env!("GIT_HEAD")),
        "path": "/",
        "links": [
            {
                "href": "/api",
                "rel": "api",
                "type": "GET"
            },
            {
                "href": "/raw/:rid/:sha/*path",
                "rel": "file_by_commit",
                "type": "GET"
            },
            {
                "href": "/raw/:rid/head/*path",
                "rel": "file_by_canonical_head",
                "type": "GET"
            },
            {
                "href": "/raw/:rid/blobs/:oid",
                "rel": "file_by_oid",
                "type": "GET"
            },
            {
                "href": "/:rid/*request",
                "rel": "git",
                "type": "GET"
            }
        ]
    });

    Json(response)
}

pub mod logger {
    use tracing::dispatcher::Dispatch;

    pub fn init() -> Result<(), tracing::subscriber::SetGlobalDefaultError> {
        tracing::dispatcher::set_global_default(Dispatch::new(subscriber()))
    }

    #[cfg(feature = "logfmt")]
    pub fn subscriber() -> impl tracing::Subscriber {
        use tracing_subscriber::layer::SubscriberExt as _;
        use tracing_subscriber::EnvFilter;

        tracing_subscriber::Registry::default()
            .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
            .with(tracing_logfmt::layer())
    }

    #[cfg(not(feature = "logfmt"))]
    pub fn subscriber() -> impl tracing::Subscriber {
        tracing_subscriber::FmtSubscriber::builder()
            .with_target(false)
            .with_max_level(tracing::Level::DEBUG)
            .finish()
    }
}

#[cfg(test)]
mod routes {
    use std::collections::HashMap;
    use std::net::SocketAddr;

    use axum::extract::connect_info::MockConnectInfo;
    use axum::http::StatusCode;

    use crate::test::{self, get};

    #[tokio::test]
    async fn test_invalid_route_returns_404() {
        let tmp = tempfile::tempdir().unwrap();
        let app = super::router(
            super::Options {
                aliases: HashMap::new(),
                listen: super::ListenAddress::Tcp(SocketAddr::from(([0, 0, 0, 0], 8080))),
                cache: None,
            },
            test::profile(tmp.path(), [0xff; 32]),
        )
        .unwrap()
        .layer(MockConnectInfo(SocketAddr::from(([0, 0, 0, 0], 8080))));

        let response = get(&app, "/aa/a").await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
