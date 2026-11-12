//! M0 C-first desktop supervisor for pong-studio.
//!
//! Owns the pong Node sidecar:
//!   - Job Object (`KILL_ON_JOB_CLOSE`) joined *before* spawn, so the whole tree
//!     dies with the supervisor even on a hard kill;
//!   - probe-then-handoff port selection (never hardcodes 5678);
//!   - `/healthz` readiness polling with fast-fail on child exit;
//!   - graceful shutdown: control endpoint -> close stdin -> wait -> kill tree.
//!
//! The browser path is the M1 delivery (`scripts/start-desktop.mjs` is the
//! throwaway entry point); M3 embeds these modules in the Tauri shell.

mod cli;
mod health;
mod job;
mod pong;
mod port;
mod shutdown;

use std::process::{Command, ExitCode, Stdio};
use std::time::{Duration, Instant};

use cli::Config;

const MAX_SPAWN_ATTEMPTS: u8 = 2;

fn main() -> ExitCode {
    match run() {
        Ok(code) => ExitCode::from(code),
        Err(err) => {
            eprintln!("[fatal] {err}");
            ExitCode::from(1)
        }
    }
}

fn run() -> Result<u8, String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let cfg = match cli::parse(&args)? {
        Some(cfg) => cfg,
        None => {
            print!("{}", cli::USAGE);
            return Ok(0);
        }
    };
    if cfg.self_test {
        println!("[mode] self-test (spawn, health, shutdown, report)");
    } else if cfg.dev {
        println!("[mode] dev foreground");
    }

    let workspace = pong::workspace_root();
    let user_folder = pong::user_folder(&cfg);
    println!("[config] workspace={}", workspace.display());
    println!("[config] user_folder={}", user_folder.display());
    println!(
        "[config] health_timeout={:?} shutdown_grace={:?}",
        cfg.health_timeout, cfg.shutdown_grace
    );

    // --- Job Object -------------------------------------------------------
    let job = if cfg.no_job {
        println!("[job] disabled by --no-job (no orphan guarantee)");
        None
    } else {
        match job::Job::create_kill_on_close().and_then(|job| job.assign_self().map(|_| job)) {
            Ok(job) => {
                println!(
                    "[job] KILL_ON_JOB_CLOSE active (process already inside a job before us: {})",
                    job::Job::self_in_job()
                );
                Some(job)
            }
            Err(err) => {
                println!("[job] WARN: Job Object unavailable: {err} (falling back to taskkill tree)");
                None
            }
        }
    };

    // Ctrl+C requests a shutdown instead of terminating immediately.
    let _ = job::install_ctrl_handler();
    println!("[supervisor] pid={}", std::process::id());

    // --- Spawn + readiness (retry once on startup failure) ----------------
    let mut attempt: u8 = 0;
    let (mut pong_proc, ready_after) = loop {
        attempt += 1;
        if std::env::var_os("PONG_SUPERVISOR_DEBUG").is_some() {
            eprintln!("[debug] attempt {attempt}: preferred port={:?}", cfg.port);
        }
        let port = port::pick(cfg.port).map_err(|err| format!("port selection failed: {err}"))?;
        println!("[spawn] attempt {attempt}/{MAX_SPAWN_ATTEMPTS} port={port}");

        let mut proc = pong::spawn(&cfg, port)
            .map_err(|err| format!("failed to spawn pong: {err}"))?;
        if let Some(job) = &job {
            // Self-join already covers this; explicit assign keeps the intent
            // visible and is required if the self-join ever gets skipped.
            let _ = job.assign_child(&proc.child);
        }
        println!("[spawn] pong pid={} url={}", proc.child.id(), proc.url);

        match health::wait_ready(port, cfg.health_timeout, &mut proc.child) {
            Ok(elapsed) => break (proc, elapsed),
            Err(err) => {
                println!("[health] failed: {err}");
                shutdown::kill_tree(&mut proc.child);
                if attempt >= MAX_SPAWN_ATTEMPTS || cfg.port.is_some() {
                    return Err(format!(
                        "pong did not become healthy on 127.0.0.1:{port} ({err})"
                    ));
                }
                println!("[health] retrying with a new port (probe-then-handoff race)");
            }
        }
    };

    let chosen_port = pong_proc.port;
    println!("[ready] /healthz 200 in {} ms", ready_after.as_millis());
    println!("[ready] READY_MS={}", ready_after.as_millis());
    println!("[ready] PORT={chosen_port}");
    println!("[ready] PONG_PID={}", pong_proc.child.id());
    println!("[ready] URL={}", pong_proc.url);

    if !cfg.no_browser {
        open_browser(&pong_proc.url);
    }

    // --- Self-test: shut down immediately and report ---------------------
    if cfg.self_test {
        return self_test_shutdown(&cfg, &mut pong_proc, chosen_port);
    }

    // --- Foreground watch loop -------------------------------------------
    loop {
        if job::shutdown_requested() {
            println!("[watch] Ctrl+C received; starting graceful shutdown");
            break;
        }
        match pong_proc.child.try_wait() {
            Ok(Some(status)) => {
                println!("[watch] pong exited unexpectedly with {status}");
                return Ok(status.code().unwrap_or(1) as u8);
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(200)),
            Err(err) => {
                println!("[watch] try_wait failed: {err}");
                break;
            }
        }
    }

    let report = shutdown::run(&mut pong_proc.child, chosen_port, cfg.shutdown_grace);
    println!(
        "[exit] graceful={} forced={} exit_code={:?} control_endpoint={:?} took={} ms",
        report.graceful,
        report.forced,
        report.exit_code,
        report.control_endpoint,
        report.took.as_millis()
    );
    Ok(0)
}

fn self_test_shutdown(
    cfg: &Config,
    pong_proc: &mut pong::PongProcess,
    port: u16,
) -> Result<u8, String> {
    let report = shutdown::run(&mut pong_proc.child, port, cfg.shutdown_grace);
    println!("SELF_TEST=1");
    println!("SHUTDOWN_GRACEFUL={}", report.graceful);
    println!("SHUTDOWN_FORCED={}", report.forced);
    println!("EXIT_CODE={:?}", report.exit_code);
    println!("SHUTDOWN_MS={}", report.took.as_millis());
    if report.graceful {
        Ok(0)
    } else {
        // Not a hard failure: pong has no /internal/shutdown yet, so M0 expects
        // the forced path. Return 0 but make the label explicit for smoke tests.
        println!("SELF_TEST_NOTE=forced-kill-expected-until-pong-adds-control-endpoint");
        Ok(0)
    }
}

#[cfg(windows)]
fn open_browser(url: &str) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let mut command = Command::new("cmd");
    command
        .args(["/c", "start", "", url])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW);
    match command.spawn() {
        Ok(_) => println!("[browser] opened {url}"),
        Err(err) => println!("[browser] failed to open ({err}); open manually: {url}"),
    }
}

#[cfg(not(windows))]
fn open_browser(url: &str) {
    println!("[browser] open manually: {url}");
}

/// Unused-timing helper kept for future restart SLOs.
#[allow(dead_code)]
fn elapsed_ms(start: Instant) -> u128 {
    start.elapsed().as_millis()
}
