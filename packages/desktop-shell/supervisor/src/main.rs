//! M0 C-first desktop supervisor for pong-studio.
//!
//! Owns the pong Node sidecar:
//!   - Job Object (`KILL_ON_JOB_CLOSE`) joined *before* spawn, so the whole tree
//!     dies with the supervisor even on a hard kill;
//!   - probe-then-handoff port selection (never hardcodes 5678);
//!   - staged startup: `/healthz` (liveness) -> `/healthz/readiness` (control
//!     plane only works after readiness) -> `GET /internal/control/health`
//!     with `x-pong-control-token`;
//!   - graceful shutdown: `POST /internal/control/shutdown` (202) -> wait for
//!     exit -> close stdin fallback -> kill tree.
//!
//! The browser path is the M1 delivery (`scripts/start-desktop.mjs` is the
//! throwaway entry point); M3 embeds these modules in the Tauri shell.

mod cli;
mod control;
mod health;
mod job;
mod pong;
mod port;
mod shutdown;
mod token;

use std::io;
use std::path::Path;
use std::process::{Child, Command, ExitCode, Stdio};
use std::time::{Duration, Instant};

use cli::Config;

const MAX_SPAWN_ATTEMPTS: u8 = 2;
const CONTROL_PROBE_TIMEOUT: Duration = Duration::from_secs(15);

fn main() -> ExitCode {
    match run() {
        Ok(code) => ExitCode::from(code),
        Err(err) => {
            eprintln!("[fatal] {err}");
            ExitCode::from(1)
        }
    }
}

fn ms_since(start: Instant) -> u128 {
    start.elapsed().as_millis()
}

/// Polls the control health endpoint until it reports `status: "ok"`.
fn wait_for_control(
    port: u16,
    token: &str,
    timeout: Duration,
    child: &mut Child,
) -> Result<Duration, control::ControlError> {
    let started = Instant::now();
    let mut last_error: Option<control::ControlError> = None;
    loop {
        if started.elapsed() >= timeout {
            return Err(last_error.unwrap_or(control::ControlError::NotConfigured));
        }
        if let Ok(Some(status)) = child.try_wait() {
            return Err(control::ControlError::Transport(io::Error::new(
                io::ErrorKind::Other,
                format!("pong exited during control probe ({status})"),
            )));
        }
        match control::health(port, token, Duration::from_millis(1500)) {
            Ok(health) if health.status == "ok" => return Ok(started.elapsed()),
            Ok(_) => last_error = Some(control::ControlError::Unexpected(200)),
            Err(err) => last_error = Some(err),
        }
        std::thread::sleep(Duration::from_millis(250));
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
        println!("[mode] self-test (liveness -> readiness -> control -> shutdown -> assert)");
    } else if cfg.dev {
        println!("[mode] dev foreground");
    }

    let workspace = pong::workspace_root();
    let user_folder = pong::user_folder(&cfg);
    println!("[config] workspace={}", workspace.display());
    println!("[config] user_folder={}", user_folder.display());
    println!(
        "[config] liveness_timeout={:?} readiness_timeout={:?} shutdown_timeout={:?} stdin_grace={:?}",
        cfg.liveness_timeout, cfg.readiness_timeout, cfg.shutdown_timeout, cfg.stdin_grace
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

    // --- Spawn + staged readiness (retry once on startup failure) ---------
    let mut attempt: u8 = 0;
    let (mut pong_proc, liveness, readiness, control_ready, total_ready) = loop {
        attempt += 1;
        if std::env::var_os("PONG_SUPERVISOR_DEBUG").is_some() {
            eprintln!("[debug] attempt {attempt}: preferred port={:?}", cfg.port);
        }
        let port = port::pick(cfg.port).map_err(|err| format!("port selection failed: {err}"))?;
        println!("[spawn] attempt {attempt}/{MAX_SPAWN_ATTEMPTS} port={port}");

        let mut proc =
            pong::spawn(&cfg, port).map_err(|err| format!("failed to spawn pong: {err}"))?;
        if let Some(job) = &job {
            // Self-join already covers this; explicit assign keeps the intent visible.
            let _ = job.assign_child(&proc.child);
        }
        let spawn_started = Instant::now();
        println!("[spawn] pong pid={} url={}", proc.child.id(), proc.url);

        // Stage 1: liveness (the HTTP server is listening).
        println!("[stage] liveness: waiting for GET /healthz (budget {:?})", cfg.liveness_timeout);
        let liveness = match health::wait_for_2xx(
            port,
            "/healthz",
            cfg.liveness_timeout,
            &mut proc.child,
        ) {
            Ok(elapsed) => {
                println!(
                    "[stage] liveness 200 in {} ms (total {} ms)",
                    elapsed.as_millis(),
                    ms_since(spawn_started)
                );
                elapsed
            }
            Err(err) => {
                println!("[stage] liveness FAILED after {} ms: {err}", ms_since(spawn_started));
                shutdown::kill_tree(&mut proc.child);
                if attempt >= MAX_SPAWN_ATTEMPTS || cfg.port.is_some() {
                    return Err(format!("pong never became live on 127.0.0.1:{port}: {err}"));
                }
                println!("[stage] retrying with a new port (probe-then-handoff race)");
                continue;
            }
        };

        // Stage 2: readiness (DB migrated + init done; the control plane is only
        // usable after this point). Budget is measured from spawn.
        let readiness_budget = cfg.readiness_timeout.saturating_sub(spawn_started.elapsed());
        println!(
            "[stage] readiness: waiting for GET /healthz/readiness (remaining budget {:?})",
            readiness_budget
        );
        let readiness = match health::wait_for_2xx(
            port,
            "/healthz/readiness",
            readiness_budget,
            &mut proc.child,
        ) {
            Ok(elapsed) => {
                println!(
                    "[stage] readiness 200 in {} ms (total {} ms)",
                    elapsed.as_millis(),
                    ms_since(spawn_started)
                );
                elapsed
            }
            Err(err) => {
                println!(
                    "[stage] readiness FAILED after {} ms (budget {:?}): {err}",
                    ms_since(spawn_started),
                    cfg.readiness_timeout
                );
                println!(
                    "[stage] hint: raise --readiness-timeout for cold starts (module graph + AV scan)"
                );
                shutdown::kill_tree(&mut proc.child);
                return Err(format!(
                    "pong started but never became ready on 127.0.0.1:{port}: {err}"
                ));
            }
        };

        // Stage 3: control plane (token enforcement is proven in self-test).
        println!("[stage] control: probing GET /internal/control/health");
        let control_started = Instant::now();
        let (control_ready, control_duration) =
            match wait_for_control(port, &proc.control_token, CONTROL_PROBE_TIMEOUT, &mut proc.child)
            {
                Ok(elapsed) => {
                    println!(
                        "[stage] control 200 in {} ms (total {} ms)",
                        elapsed.as_millis(),
                        ms_since(spawn_started)
                    );
                    (true, elapsed)
                }
                Err(control::ControlError::Unauthorized(code)) => {
                    shutdown::kill_tree(&mut proc.child);
                    return Err(format!(
                        "control token rejected on 127.0.0.1:{port} (HTTP {code}); PONG_CONTROL_TOKEN injection is broken"
                    ));
                }
                Err(err) => {
                    let elapsed = control_started.elapsed();
                    println!(
                        "[stage] control UNAVAILABLE after {} ms: {err}",
                        elapsed.as_millis()
                    );
                    println!(
                        "[stage] WARN: shutdown will fall back to stdin + kill tree (WAL checkpoint not guaranteed)"
                    );
                    (false, elapsed)
                }
            };
        let _ = control_duration;
        break (
            proc,
            liveness,
            readiness,
            control_ready,
            ms_since(spawn_started),
        );
    };

    println!("[ready] /healthz 200 in {} ms", liveness.as_millis());
    println!("[ready] READY_TOTAL_MS={total_ready}");
    println!("[ready] LIVENESS_MS={}", liveness.as_millis());
    println!("[ready] READINESS_MS={}", readiness.as_millis());
    println!("[ready] CONTROL_READY={control_ready}");
    println!("[ready] PORT={}", pong_proc.port);
    println!("[ready] PONG_PID={}", pong_proc.child.id());
    println!("[ready] URL={}", pong_proc.url);

    if !cfg.no_browser {
        open_browser(&pong_proc.url);
    }

    if cfg.self_test {
        return self_test(&cfg, &mut pong_proc);
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

    let report = shutdown::run(
        &mut pong_proc.child,
        pong_proc.port,
        &pong_proc.control_token,
        cfg.shutdown_timeout,
        cfg.stdin_grace,
    );
    print_shutdown_report(&report);
    Ok(0)
}

fn print_shutdown_report(report: &shutdown::Report) {
    println!(
        "[exit] SHUTDOWN_HTTP={:?} graceful={} stdin_fallback={} forced={} exit_code={:?} exit_wait_ms={} total_ms={}",
        report.http_status,
        report.graceful_exit,
        report.used_stdin_fallback,
        report.forced,
        report.exit_code,
        report.exit_wait.as_millis(),
        report.took.as_millis()
    );
}

/// WAL size after shutdown. A graceful pong exit runs
/// `PRAGMA wal_checkpoint(TRUNCATE)`, so this must be 0 (or the file absent).
fn wal_bytes(user_folder: &Path) -> (u64, std::path::PathBuf) {
    let path = user_folder.join(".pong").join("database.sqlite-wal");
    let bytes = std::fs::metadata(&path).map(|meta| meta.len()).unwrap_or(0);
    (bytes, path)
}

fn self_test(cfg: &Config, pong_proc: &mut pong::PongProcess) -> Result<u8, String> {
    let port = pong_proc.port;
    let token = pong_proc.control_token.clone();
    let user_folder = pong_proc.user_folder.clone();

    let mut failures: Vec<String> = Vec::new();

    // 1) Control health with the token must be 200 + status ok.
    match control::health(port, &token, Duration::from_secs(5)) {
        Ok(health) => {
            println!("CONTROL_HEALTH_STATUS={}", health.status);
            match health.pid {
                Some(pid) => println!("CONTROL_HEALTH_PID={pid}"),
                None => failures.push("control health did not return pid".into()),
            }
            if health.status != "ok" {
                failures.push(format!("control health status is {:?}", health.status));
            }
        }
        Err(err) => failures.push(format!("control health with token failed: {err}")),
    }

    // 2) No token must be rejected (401), and must never be read as accepted.
    match control::health_without_token(port, Duration::from_secs(5)) {
        Ok(code) => {
            println!("NO_TOKEN_STATUS={code}");
            if code != 401 {
                failures.push(format!("expected 401 without token, got {code}"));
            }
        }
        Err(err) => failures.push(format!("no-token probe failed: {err}")),
    }

    // 3) Shutdown through the control endpoint, then wait for a graceful exit.
    let report = shutdown::run(
        &mut pong_proc.child,
        port,
        &token,
        cfg.shutdown_timeout,
        cfg.stdin_grace,
    );
    println!("SHUTDOWN_HTTP={:?}", report.http_status);
    println!("SHUTDOWN_GRACEFUL={}", report.graceful_exit);
    println!("SHUTDOWN_STDIN_FALLBACK={}", report.used_stdin_fallback);
    println!("SHUTDOWN_FORCED={}", report.forced);
    println!("SHUTDOWN_EXIT_WAIT_MS={}", report.exit_wait.as_millis());
    println!("SHUTDOWN_TOTAL_MS={}", report.took.as_millis());
    println!("EXIT_CODE={:?}", report.exit_code);

    if report.http_status != Some(202) {
        failures.push(format!(
            "control shutdown did not return 202 (got {:?})",
            report.http_status
        ));
    }
    if !report.graceful_exit {
        failures.push("pong did not exit gracefully after the control request".into());
    }
    if report.forced {
        failures.push("pong had to be force-killed (WAL checkpoint skipped)".into());
    }
    if report.exit_code != Some(0) {
        failures.push(format!("expected exit code 0, got {:?}", report.exit_code));
    }

    // 4) Graceful exit must have truncated the SQLite WAL.
    let (wal, wal_path) = wal_bytes(&user_folder);
    println!("WAL_BYTES={wal}");
    println!("WAL_PATH={}", wal_path.display());
    if wal != 0 {
        failures.push(format!(
            "WAL not truncated after graceful exit: {wal} bytes at {}",
            wal_path.display()
        ));
    }

    println!("SELF_TEST={}", if failures.is_empty() { "PASS" } else { "FAIL" });
    if failures.is_empty() {
        println!("SELF_TEST_FAILURES=none");
        Ok(0)
    } else {
        println!("SELF_TEST_FAILURES={}", failures.join(" | "));
        Ok(1)
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
