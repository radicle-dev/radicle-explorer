#![allow(clippy::type_complexity)]
#![allow(clippy::too_many_arguments)]
#![recursion_limit = "256"]
pub mod error;

use std::collections::HashMap;
use std::num::NonZeroUsize;
#[cfg(unix)]
use std::path::Path;
use std::process::Command;
use std::str;
use std::sync::Arc;
use std::time::Duration;

#[cfg(unix)]
use tokio::signal::unix::{signal, Signal, SignalKind};

use anyhow::Context as _;
use axum::body::Body;
use axum::http::Request;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{middleware, Json, Router};
use axum_listener::{DualAddr, DualListener};
use hyper::body::Body as _;
use hyper::header::CONTENT_TYPE;
use hyper::Method;
use tokio_util::sync::CancellationToken;
use tower_http::cors;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::Span;

use radicle::identity::RepoId;
use radicle::Profile;

use crate::api::RADICLE_VERSION;
use crate::tracing_extra::{tracing_middleware, ColoredStatus, Paint, RequestId, TracingInfo};

mod api;
mod axum_extra;
mod cache;
mod children;
mod git;
mod raw;
#[cfg(test)]
mod test;
mod tracing_extra;

/// Default cache HTTP size.
pub const DEFAULT_CACHE_SIZE: NonZeroUsize = NonZeroUsize::new(100).unwrap();

/// Default time in-flight requests get to finish after a shutdown signal.
pub const DEFAULT_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(5);

/// Resolve a repo path segment to a [`RepoId`]. The segment may be either a
/// canonical RID or one of the aliases configured via `--alias`. Returns
/// `None` when it is neither, letting each caller map that to its own error.
pub(crate) fn resolve_rid(name: &str, aliases: &HashMap<String, RepoId>) -> Option<RepoId> {
    name.parse::<RepoId>()
        .ok()
        .or_else(|| aliases.get(name).copied())
}

#[derive(Debug, Clone)]
pub struct Options {
    pub aliases: HashMap<String, RepoId>,
    pub listen: DualAddr,
    pub cache: Option<NonZeroUsize>,
    /// How long in-flight requests get to finish after a shutdown signal.
    pub shutdown_timeout: Duration,
    /// Search backend configuration. `None` disables search at runtime and
    /// falls back to the built-in storage walk.
    pub search: Option<SearchOptions>,
}

#[derive(Debug, Clone)]
pub struct SearchOptions {
    pub url: String,
    pub api_key: Option<String>,
    pub index_name: String,
    pub query_timeout: std::time::Duration,
}

/// Run the Server.
pub async fn run(options: Options) -> anyhow::Result<()> {
    let git_version = Command::new("git")
        .arg("version")
        .output()
        .context("'git' command must be available")?
        .stdout;

    tracing::info!("{}", str::from_utf8(&git_version)?.trim());

    // Listing a repo's refs resolves every remote's signed refs through libgit2,
    // opening a descriptor per packfile. Radicle storage can hold thousands of
    // packfiles, so under a low default limit reads exhaust file descriptors and
    // objects in unopened packs fail with spurious "missing" errors.
    if let Err(e) = radicle::io::set_file_limit(4096) {
        tracing::warn!("Unable to set open file limit: {e}");
    }

    let termination = TerminationSignals::register()?;

    let listener = DualListener::bind(&options.listen).await?;
    tracing::info!("listening on {:?}", &options.listen);

    #[cfg(unix)]
    let _socket_guard = SocketGuard::new(&options.listen);

    let profile = Profile::load()?;
    let request_id = RequestId::new();

    tracing::info!("using radicle home at {}", profile.home().path().display());

    let shutdown_timeout = options.shutdown_timeout;
    let web_config = api::WebConfig::from_profile(&profile);
    let profile = Arc::new(profile);
    let ctx = api::Context::new(profile.clone(), web_config.clone(), &options)?;

    #[cfg(unix)]
    tokio::spawn(async move {
        let mut sighup = signal(SignalKind::hangup()).expect("Failed to register SIGHUP handler");

        loop {
            sighup.recv().await;
            tracing::info!("Received SIGHUP, reloading web configuration");

            match Profile::load() {
                Ok(new_profile) => {
                    web_config
                        .update(|config| {
                            *config = new_profile.config.web.clone();
                        })
                        .await;
                    tracing::info!("Web configuration reloaded successfully");
                }
                Err(e) => {
                    tracing::error!("Failed to reload configuration: {:#}", e);
                    tracing::warn!("Continuing with previous configuration");
                }
            }
        }
    });

    let children = children::Children::default();
    let app = router(options, profile, ctx, children.clone())?
        .layer(middleware::from_fn(tracing_middleware))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(move |request: &Request<Body>| {
                    if let Some(forwarded) = request.headers().get("X-Forwarded-For").and_then(|s| s.to_str().ok()) {
                        tracing::info_span!("request", id = %request_id.clone().next(), "X-Forwarded-For" = forwarded)
                    } else {
                        tracing::info_span!("request", id = %request_id.clone().next())
                    }
                })
                .on_response(
                    |response: &hyper::Response<Body>, latency: Duration, _span: &Span| {
                        if let Some(info) = response.extensions().get::<TracingInfo>() {
                            tracing::info!(
                                "{} \"{} {} {:?}\" {} {:?} {}",
                                match info.connect_info.0 {
                                    DualAddr::Tcp(c) => c.to_string(),
                                    #[cfg(unix)]
                                    DualAddr::Uds(_) => "unix-socket".into()
                                },
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
                )
        ).into_make_service_with_connect_info::<DualAddr>();

    let drained = CancellationToken::new();
    let server =
        axum::serve(listener, app).with_graceful_shutdown(drained.clone().cancelled_owned());

    tokio::select! {
        result = server => result.map_err(anyhow::Error::from),
        reason = drain(termination, drained, shutdown_timeout) => {
            children.kill_all().await;
            Err(anyhow::Error::msg(reason))
        }
    }
}

/// Start the drain on the first termination signal and resolve with the reason
/// it has to be cut short: the budget ran out, or a second signal asked for it.
async fn drain(
    mut termination: TerminationSignals,
    drained: CancellationToken,
    timeout: Duration,
) -> String {
    let first = termination.recv().await;
    tracing::info!("Received {first}, draining in-flight requests");
    drained.cancel();

    tokio::select! {
        _ = tokio::time::sleep(timeout) => {
            format!("Drain timeout of {timeout:?} elapsed, exiting with requests still in flight")
        }
        second = termination.recv() => {
            format!("Received {second} while draining, exiting with requests still in flight")
        }
    }
}

/// The signals that ask the daemon to stop. Registered up front, before the
/// listener is bound, so a signal arriving during startup is held until the
/// server polls for it instead of ending the process outright, and kept for
/// the whole drain so a second signal can cut it short. SIGHUP is deliberately
/// left to the configuration reloader.
#[cfg(unix)]
struct TerminationSignals {
    sigterm: Signal,
    sigint: Signal,
}

#[cfg(unix)]
impl TerminationSignals {
    fn register() -> anyhow::Result<Self> {
        Ok(Self {
            sigterm: signal(SignalKind::terminate())
                .context("Unable to register SIGTERM handler")?,
            sigint: signal(SignalKind::interrupt()).context("Unable to register SIGINT handler")?,
        })
    }

    /// Wait for the next termination signal, yielding its name.
    async fn recv(&mut self) -> &'static str {
        tokio::select! {
            _ = self.sigterm.recv() => "SIGTERM",
            _ = self.sigint.recv() => "SIGINT",
        }
    }
}

#[cfg(not(unix))]
struct TerminationSignals;

#[cfg(not(unix))]
impl TerminationSignals {
    fn register() -> anyhow::Result<Self> {
        Ok(Self)
    }

    async fn recv(&mut self) -> &'static str {
        let _ = tokio::signal::ctrl_c().await;
        "SIGINT"
    }
}

/// The filesystem path a listen address binds, if it is a Unix socket.
#[cfg(unix)]
pub fn socket_path(listen: &DualAddr) -> Option<&Path> {
    let DualAddr::Uds(addr) = listen else {
        return None;
    };
    addr.as_pathname()
}

/// Unlinks the socket file once the server is done with it, on every exit path
/// after the bind. The inode bound at construction is recorded so that a socket
/// a replacement process bound at the same path is left alone.
#[cfg(unix)]
struct SocketGuard {
    path: std::path::PathBuf,
    dev: u64,
    ino: u64,
}

#[cfg(unix)]
impl SocketGuard {
    fn new(listen: &DualAddr) -> Option<Self> {
        use std::os::unix::fs::MetadataExt as _;

        let path = socket_path(listen)?.to_path_buf();
        let meta = std::fs::metadata(&path)
            .inspect_err(|e| tracing::warn!("Unable to stat socket at {}: {e}", path.display()))
            .ok()?;

        Some(Self {
            path,
            dev: meta.dev(),
            ino: meta.ino(),
        })
    }

    fn holds_bound_inode(&self) -> bool {
        use std::os::unix::fs::MetadataExt as _;

        std::fs::metadata(&self.path)
            .is_ok_and(|meta| meta.dev() == self.dev && meta.ino() == self.ino)
    }
}

#[cfg(unix)]
impl Drop for SocketGuard {
    fn drop(&mut self) {
        if !self.holds_bound_inode() {
            tracing::warn!(
                "Leaving socket at {}: no longer the inode this process bound",
                self.path.display()
            );
            return;
        }
        if let Err(e) = std::fs::remove_file(&self.path) {
            tracing::warn!("Unable to remove socket at {}: {e}", self.path.display());
        }
    }
}

/// Create a router consisting of other sub-routers.
fn router(
    options: Options,
    profile: Arc<Profile>,
    ctx: api::Context,
    children: children::Children,
) -> anyhow::Result<Router> {
    let api_router = api::router(ctx);
    let aliases = Arc::new(options.aliases);
    let git_router = git::router(profile.clone(), aliases.clone(), children.clone());
    let raw_router = raw::router(profile, aliases, children);

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
        use tracing_subscriber::EnvFilter;

        tracing_subscriber::FmtSubscriber::builder()
            .with_target(false)
            .with_env_filter(
                EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
            )
            .finish()
    }
}

#[cfg(test)]
mod routes {
    use std::collections::HashMap;
    use std::net::SocketAddr;

    use axum::extract::connect_info::MockConnectInfo;
    use axum::http::StatusCode;
    use axum_listener::DualAddr;

    use crate::test;

    #[tokio::test]
    async fn test_invalid_route_returns_404() {
        let tmp = tempfile::tempdir().unwrap();
        let options = super::Options {
            aliases: HashMap::new(),
            listen: DualAddr::Tcp(SocketAddr::from(([0, 0, 0, 0], 8080))),
            cache: None,
            shutdown_timeout: super::DEFAULT_SHUTDOWN_TIMEOUT,
            search: None,
        };
        let profile = test::profile(tmp.path(), [0xff; 32]);
        let web_config = crate::api::WebConfig::from_profile(&profile);
        let profile = std::sync::Arc::new(profile);
        let ctx = crate::api::Context::new(profile.clone(), web_config, &options).unwrap();
        let app = super::router(options, profile, ctx, Default::default())
            .unwrap()
            .layer(MockConnectInfo(DualAddr::Tcp(SocketAddr::from((
                [0, 0, 0, 0],
                8080,
            )))));

        let response = test::get(&app, "/aa/a").await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
