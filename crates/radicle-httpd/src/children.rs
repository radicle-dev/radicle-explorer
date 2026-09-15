use std::time::Duration;

use tokio::process::{Child, Command};
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
    /// Reap `child` in the background once it exits.
    pub fn supervise(&self, mut child: Child) {
        let cancel = self.cancel.clone();
        self.tracker.spawn(async move {
            tokio::select! {
                _ = child.wait() => {}
                _ = cancel.cancelled() => {
                    if let Err(e) = child.kill().await {
                        tracing::warn!("Unable to kill git process: {e}");
                    }
                }
            }
        });
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
