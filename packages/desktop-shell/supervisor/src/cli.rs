//! Command-line surface of the M0 supervisor.
//!
//! Default mode is the foreground dev supervisor: spawn pong, wait for
//! `/healthz` then `/healthz/readiness`, wait for the control plane, open a
//! browser, keep watching, shut down through the control endpoint.
//! M3 embeds the same modules instead of re-implementing them.

use std::path::PathBuf;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub node: Option<PathBuf>,
    pub pong_entry: Option<PathBuf>,
    pub port: Option<u16>,
    pub no_browser: bool,
    pub no_job: bool,
    pub self_test: bool,
    pub dev: bool,
    pub user_folder: Option<PathBuf>,
    pub cwd: Option<PathBuf>,
    /// `/healthz` (liveness) budget.
    pub liveness_timeout: Duration,
    /// `/healthz/readiness` budget, measured from spawn. Default 120 s; a cold
    /// first start can need several minutes, so raise it.
    pub readiness_timeout: Duration,
    /// How long to wait for pong to exit after a 202 from the control endpoint.
    pub shutdown_timeout: Duration,
    /// Fallback budget after closing the child's stdin.
    pub stdin_grace: Duration,
    pub log_level: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            node: None,
            pong_entry: None,
            port: None,
            no_browser: false,
            no_job: false,
            self_test: false,
            dev: true,
            user_folder: None,
            cwd: None,
            liveness_timeout: Duration::from_secs(60),
            readiness_timeout: Duration::from_secs(120),
            shutdown_timeout: Duration::from_secs(30),
            stdin_grace: Duration::from_secs(5),
            log_level: "info".to_string(),
        }
    }
}

pub const USAGE: &str = "\
pong-desktop-supervisor 0.2.0 (M0 C-first supervisor)

USAGE:
    pong-desktop-supervisor [OPTIONS]

MODES:
    --dev                     Foreground dev mode (default; accepted explicitly)
    --self-test               Spawn real pong, wait for liveness + readiness +
                              control plane, verify no-token 401, request shutdown,
                              assert exit code 0 and WAL=0, print a machine-readable
                              report, exit 0 only when every check passes

OPTIONS:
    --port <PORT>             Use this port on 127.0.0.1. Default: OS-assigned free
                              port (probe-then-handoff; 5678 is never used)
    --node <PATH>             node.exe to run pong with (default: Node 24 from
                              <workspace>/../.tools/node24, else node.exe on PATH)
    --pong <PATH>             pong CLI entry script (default:
                              <workspace>/packages/cli/bin/pong)
    --user-folder <PATH>      PONG_USER_FOLDER (default: <workspace>/.pong-data)
    --cwd <PATH>              Working directory for pong (default: workspace)
    --liveness-timeout <SECS> Max seconds to wait for /healthz (default: 60)
    --readiness-timeout <S>   Max seconds to wait for /healthz/readiness, measured
                              from spawn (default: 120; raise for cold starts)
    --health-timeout <S>      Deprecated alias for --readiness-timeout
    --shutdown-timeout <S>    Seconds to wait for exit after the control endpoint
                              accepted the shutdown (default: 30)
    --stdin-grace <S>         Fallback seconds after closing stdin (default: 5)
    --no-browser              Do not open the default browser
    --no-job                  Do not create the Job Object (debugging only; no
                              orphan cleanup guarantee)
    -h, --help                Print this help

ENVIRONMENT:
    PONG_DESKTOP_NODE         Default for --node
    PONG_DESKTOP_PONG         Default for --pong
    PONG_DESKTOP_WORKSPACE    Override the inferred pong-studio repo root
    PONG_USER_FOLDER          Default for --user-folder
    PONG_CONTROL_TOKEN        Override the generated control token (tests/host)
";

fn take_value(
    args: &[String],
    index: &mut usize,
    inline: Option<&str>,
    flag: &str,
) -> Result<String, String> {
    if let Some(value) = inline {
        if value.is_empty() {
            return Err(format!("{flag} needs a value"));
        }
        return Ok(value.to_string());
    }
    *index += 1;
    args.get(*index)
        .cloned()
        .ok_or_else(|| format!("{flag} needs a value"))
}

fn parse_secs(value: &str, flag: &str) -> Result<Duration, String> {
    value
        .parse::<u64>()
        .map(Duration::from_secs)
        .map_err(|_| format!("{flag} expects an integer number of seconds, got {value:?}"))
}

/// Parses argv (without the program name). `Ok(None)` means help was requested.
pub fn parse(args: &[String]) -> Result<Option<Config>, String> {
    let mut cfg = Config::default();
    let mut index = 0usize;

    while index < args.len() {
        let raw = &args[index];
        let (flag, inline) = match raw.split_once('=') {
            Some((flag, value)) => (flag, Some(value)),
            None => (raw.as_str(), None),
        };
        match flag {
            "-h" | "--help" => return Ok(None),
            "--dev" => cfg.dev = true,
            "--self-test" => cfg.self_test = true,
            "--no-browser" => cfg.no_browser = true,
            "--no-job" => cfg.no_job = true,
            "--port" => {
                let value = take_value(args, &mut index, inline, "--port")?;
                cfg.port = Some(
                    value
                        .parse::<u16>()
                        .map_err(|_| format!("--port expects 1-65535, got {value:?}"))?,
                );
                if cfg.port == Some(0) {
                    return Err(
                        "--port 0 is not allowed; omit --port for an OS-assigned port".into()
                    );
                }
            }
            "--node" => {
                cfg.node = Some(PathBuf::from(take_value(args, &mut index, inline, "--node")?));
            }
            "--pong" => {
                cfg.pong_entry =
                    Some(PathBuf::from(take_value(args, &mut index, inline, "--pong")?));
            }
            "--user-folder" => {
                cfg.user_folder = Some(PathBuf::from(take_value(
                    args,
                    &mut index,
                    inline,
                    "--user-folder",
                )?));
            }
            "--cwd" => {
                cfg.cwd = Some(PathBuf::from(take_value(args, &mut index, inline, "--cwd")?));
            }
            "--liveness-timeout" => {
                cfg.liveness_timeout = parse_secs(
                    &take_value(args, &mut index, inline, "--liveness-timeout")?,
                    "--liveness-timeout",
                )?;
            }
            "--readiness-timeout" | "--health-timeout" => {
                cfg.readiness_timeout =
                    parse_secs(&take_value(args, &mut index, inline, flag)?, flag)?;
            }
            "--shutdown-timeout" => {
                cfg.shutdown_timeout = parse_secs(
                    &take_value(args, &mut index, inline, "--shutdown-timeout")?,
                    "--shutdown-timeout",
                )?;
            }
            "--stdin-grace" => {
                cfg.stdin_grace = parse_secs(
                    &take_value(args, &mut index, inline, "--stdin-grace")?,
                    "--stdin-grace",
                )?;
            }
            "--log-level" => {
                cfg.log_level = take_value(args, &mut index, inline, "--log-level")?;
            }
            other => return Err(format!("unknown argument {other:?} (try --help)")),
        }
        index += 1;
    }
    Ok(Some(cfg))
}
