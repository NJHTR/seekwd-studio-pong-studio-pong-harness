//! Shutdown sequence for the C-first desktop path.
//!
//! Contract (M0 measured, task-12):
//!   1. the control plane is only usable once `/healthz/readiness` reports 2xx;
//!   2. `POST /internal/control/shutdown` with `x-pong-control-token` returns
//!      202 and then pong runs its graceful shutdown (closes the server,
//!      checkpoints the SQLite WAL, exits 0);
//!   3. wait up to `exit_timeout` for the process to exit;
//!   4. only if it does not exit: close stdin (fallback), wait `stdin_grace`, then
//!      kill the process tree (`taskkill /T /F`, then `Child::kill`).
//!
//! The Job Object with `KILL_ON_JOB_CLOSE` stays a crash-safety net, not the
//! normal path: closing it first would `TerminateProcess` pong before it can
//! checkpoint the WAL.

use std::io::Write;
use std::process::{Child, Stdio};
use std::time::{Duration, Instant};

use crate::control;

#[derive(Debug, Clone)]
pub struct Report {
    /// HTTP status from `POST /internal/control/shutdown` (202 expected).
    pub http_status: Option<u16>,
    /// Process exited before any forced kill.
    pub graceful_exit: bool,
    /// stdin was closed because the control path failed or timed out.
    pub used_stdin_fallback: bool,
    pub forced: bool,
    pub exit_code: Option<i32>,
    /// Time from the 202 (or fallback start) until the process exited.
    pub exit_wait: Duration,
    pub took: Duration,
}

fn wait_exit(child: &mut Child, limit: Duration) -> bool {
    let deadline = Instant::now() + limit;
    while Instant::now() < deadline {
        match child.try_wait() {
            Ok(Some(_)) => return true,
            Ok(None) => std::thread::sleep(Duration::from_millis(100)),
            Err(err) => {
                println!("[shutdown] try_wait failed: {err}");
                return false;
            }
        }
    }
    false
}

pub fn run(
    child: &mut Child,
    port: u16,
    token: &str,
    exit_timeout: Duration,
    stdin_grace: Duration,
) -> Report {
    let started = Instant::now();

    // 1) Control-plane shutdown. Only 202 counts: pong's SPA catch-all answers
    //    unknown requests with 200 + HTML, so any other status is a failure.
    let mut http_status = None;
    let mut control_accepted = false;
    let exit_started = Instant::now();

    match control::shutdown(port, token, Duration::from_secs(5)) {
        Ok(status) if status == 202 => {
            println!("[shutdown] POST /internal/control/shutdown -> 202 accepted");
            http_status = Some(status);
            control_accepted = true;
        }
        Ok(status) => {
            http_status = Some(status);
            println!(
                "[shutdown] POST /internal/control/shutdown -> HTTP {status} (expected 202); falling back to stdin"
            );
        }
        Err(err) => {
            println!("[shutdown] control shutdown failed: {err}; falling back to stdin");
        }
    }

    // 2) Wait for the graceful exit if the control request was accepted.
    let mut graceful_exit = false;
    let mut exit_wait = Duration::ZERO;
    if control_accepted {
        graceful_exit = wait_exit(child, exit_timeout);
        exit_wait = exit_started.elapsed();
        if graceful_exit {
            println!(
                "[shutdown] pong exited gracefully in {} ms",
                exit_wait.as_millis()
            );
        } else {
            println!(
                "[shutdown] pong still alive {} ms after 202; falling back to stdin",
                exit_wait.as_millis()
            );
        }
    }

    // 3) Fallback: close stdin (EOF) and wait a short grace.
    let mut used_stdin_fallback = false;
    if !graceful_exit {
        used_stdin_fallback = true;
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.flush();
            drop(stdin);
            println!("[shutdown] closed child stdin (EOF fallback)");
        }
        if wait_exit(child, stdin_grace) {
            graceful_exit = true;
            if exit_wait == Duration::ZERO {
                exit_wait = exit_started.elapsed();
            }
            println!("[shutdown] pong exited after stdin EOF");
        }
    }

    // 4) Force kill the tree.
    let forced = if graceful_exit {
        false
    } else {
        println!("[shutdown] pong still alive after all graceful paths; killing process tree");
        kill_tree(child);
        true
    };

    let exit_code = child
        .try_wait()
        .ok()
        .flatten()
        .and_then(|status| status.code());

    Report {
        http_status,
        graceful_exit,
        used_stdin_fallback,
        forced,
        exit_code,
        exit_wait,
        took: started.elapsed(),
    }
}

/// Kills a process and every descendant. `Child::kill` alone is `TerminateProcess`
/// on Windows and leaves grandchildren (git/node/easyCode helpers) alive.
pub fn kill_tree(child: &mut Child) {
    let pid = child.id();

    #[cfg(windows)]
    {
        let status = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        match status {
            Ok(status) if status.success() => println!("[shutdown] taskkill /T /F /PID {pid} ok"),
            Ok(status) => {
                println!("[shutdown] taskkill exited with {status} (tree may be gone already)")
            }
            Err(err) => println!("[shutdown] taskkill failed: {err}"),
        }
    }

    let _ = child.kill();
    let _ = child.wait();
}
