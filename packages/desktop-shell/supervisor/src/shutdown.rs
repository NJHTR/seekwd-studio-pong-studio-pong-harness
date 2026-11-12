//! Graceful shutdown sequence.
//!
//! Required order (ADR-07 / M0-6):
//!   1. optional HTTP control endpoint (`POST /internal/shutdown`) — pong has no
//!      such endpoint yet, so this step is best-effort and logged;
//!   2. close the child's stdin (EOF is the portable "stop reading" signal);
//!   3. wait up to `grace`;
//!   4. kill the process tree (`taskkill /T /F`, then `Child::kill`).
//!
//! The Job Object with `KILL_ON_JOB_CLOSE` is the crash-safety net, not the
//! normal shutdown path: closing the job first would `TerminateProcess` pong
//! before it can checkpoint SQLite WAL.

use std::io::Write;
use std::process::{Child, Stdio};
use std::time::{Duration, Instant};

use crate::health;

#[derive(Debug, Clone)]
pub struct Report {
    pub control_endpoint: Option<u16>,
    pub graceful: bool,
    pub forced: bool,
    pub exit_code: Option<i32>,
    pub took: Duration,
}

pub fn run(child: &mut Child, port: u16, grace: Duration) -> Report {
    let started = Instant::now();

    // 1) Optional control endpoint. A 404 is the expected answer today.
    //
    // Do NOT trust the status code to mean "shutdown accepted": pong's SPA
    // catch-all answers unknown POSTs with 200 + index.html. The M3 endpoint
    // must prove acceptance with a JSON body or a dedicated response header.
    let control_endpoint = match health::post(port, "/internal/shutdown", Duration::from_secs(2)) {
        Ok(code) if (200..300).contains(&code) => {
            println!("[shutdown] POST /internal/shutdown -> {code} (informational only; see SPA fallback)");
            Some(code)
        }
        Ok(code) => {
            println!(
                "[shutdown] POST /internal/shutdown -> HTTP {code} (not implemented yet; continuing)"
            );
            Some(code)
        }
        Err(err) => {
            println!("[shutdown] /internal/shutdown unavailable ({err}); continuing");
            None
        }
    };

    // 2) Close stdin.
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.flush();
        drop(stdin);
        println!("[shutdown] closed child stdin (EOF)");
    }

    // 3) Wait for a graceful exit.
    let deadline = Instant::now() + grace;
    let mut graceful = false;
    while Instant::now() < deadline {
        match child.try_wait() {
            Ok(Some(_)) => {
                graceful = true;
                break;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(100)),
            Err(err) => {
                println!("[shutdown] try_wait failed: {err}");
                break;
            }
        }
    }
    if graceful {
        println!("[shutdown] pong exited within {grace:?}");
    }

    // 4) Force kill the tree.
    let forced = if graceful {
        false
    } else {
        println!("[shutdown] pong still alive after {grace:?}; killing process tree");
        kill_tree(child);
        true
    };

    let exit_code = child
        .try_wait()
        .ok()
        .flatten()
        .and_then(|status| status.code());
    Report {
        control_endpoint,
        graceful,
        forced,
        exit_code,
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
            Ok(status) => println!("[shutdown] taskkill exited with {status} (tree may be gone already)"),
            Err(err) => println!("[shutdown] taskkill failed: {err}"),
        }
    }

    let _ = child.kill();
    let _ = child.wait();
}
