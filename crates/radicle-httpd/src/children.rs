use std::io;
use std::process::ExitStatus;
use std::time::Duration;

use axum::body::Body;
use futures_util::stream::{self, StreamExt};
use tokio::io::AsyncRead;
use tokio::process::{Child, Command};
use tokio::sync::oneshot;
use tokio_util::io::ReaderStream;
use tokio_util::sync::CancellationToken;
use tokio_util::task::TaskTracker;

/// How long killed processes get to be reaped before the daemon stops waiting.
const REAP_TIMEOUT: Duration = Duration::from_secs(2);

/// A `git` command in its own process group, out of reach of the terminal and
/// service-manager signals that stop the daemon, so that a shutdown cuts a
/// streaming response short only once the drain says so.
pub fn git() -> Command {
    let mut command = Command::new("git");
    #[cfg(unix)]
    command.process_group(0);
    command
}

/// The git processes still streaming into response bodies. Each is owned by a
/// task that waits for it, so a response keeps streaming after its handler has
/// returned, while staying killable until the process exits.
#[derive(Clone, Default)]
pub struct Children {
    tracker: TaskTracker,
    cancel: CancellationToken,
}

impl Children {
    /// Stream `stdout` as a response body while reaping `child` in the
    /// background. The body ends in an error rather than a clean end-of-file
    /// unless the process exits successfully, so a killed or failed git
    /// process cannot pass a truncated response off as complete.
    pub fn stream(&self, mut child: Child, stdout: impl AsyncRead + Send + 'static) -> Body {
        let (exited_tx, exited) = oneshot::channel();
        let cancel = self.cancel.clone();
        self.tracker.spawn(async move {
            let status = tokio::select! {
                status = child.wait() => status,
                _ = cancel.cancelled() => {
                    if let Err(e) = child.start_kill() {
                        tracing::warn!("Unable to kill git process: {e}");
                    }
                    child.wait().await
                }
            };
            let _ = exited_tx.send(status);
        });

        let outcome =
            stream::once(exited).filter_map(|exit| async move { exit_error(exit).map(Err) });
        Body::from_stream(ReaderStream::new(stdout).chain(outcome))
    }

    /// Kill every process still streaming, returning once each one has been
    /// reaped, so that an exiting daemon leaves none of them behind.
    pub async fn kill_all(&self) {
        let streaming = self.tracker.len();
        if streaming > 0 {
            tracing::warn!("Killing {streaming} git process(es) still streaming");
        }
        self.cancel.cancel();
        self.tracker.close();

        if tokio::time::timeout(REAP_TIMEOUT, self.tracker.wait())
            .await
            .is_err()
        {
            tracing::warn!(
                "{} git process(es) not reaped within {REAP_TIMEOUT:?}, leaving them behind",
                self.tracker.len()
            );
        }
    }
}

/// The error a response body ends with when its process did not exit
/// successfully, or was never reaped.
fn exit_error(
    exit: Result<io::Result<ExitStatus>, oneshot::error::RecvError>,
) -> Option<io::Error> {
    match exit {
        Ok(Ok(status)) if status.success() => None,
        Ok(Ok(status)) => Some(io::Error::other(format!("git exited with {status}"))),
        Ok(Err(e)) => Some(e),
        Err(_) => Some(io::Error::other("git process was dropped before it exited")),
    }
}
