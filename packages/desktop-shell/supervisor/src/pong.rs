//! Locating and spawning the pong Node sidecar.

use std::env;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

use crate::cli::Config;

/// Repo root of `pong-studio` (derived from this crate's location, not from cwd).
pub fn workspace_root() -> PathBuf {
    if let Some(value) = env::var_os("PONG_DESKTOP_WORKSPACE") {
        return PathBuf::from(value);
    }
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn env_path(name: &str) -> Option<PathBuf> {
    env::var_os(name).map(PathBuf::from)
}

fn first_existing(candidates: impl IntoIterator<Item = PathBuf>) -> Option<PathBuf> {
    candidates.into_iter().find(|p| p.is_file())
}

/// Node 24+ is required by pong (`engines.node >= 24`). Resolution order:
/// `--node` -> `PONG_DESKTOP_NODE` -> `<workspace>/../.tools/node24/node.exe`
/// -> `node.exe` on PATH.
pub fn resolve_node(cfg: &Config) -> io::Result<PathBuf> {
    let workspace = workspace_root();
    let candidates = [
        cfg.node.clone(),
        env_path("PONG_DESKTOP_NODE"),
        workspace
            .parent()
            .map(|p| p.join(".tools").join("node24").join("node.exe")),
        Some(workspace.join(".tools").join("node24").join("node.exe")),
    ];
    if let Some(found) = first_existing(candidates.into_iter().flatten()) {
        return Ok(found);
    }
    // Fall back to PATH lookup; we cannot verify the version cheaply here, so
    // the spawn error (or pong's own engines check) reports it to the user.
    Ok(PathBuf::from("node.exe"))
}

/// The pong CLI entry script. Resolution order: `--pong` -> `PONG_DESKTOP_PONG`
/// -> `<workspace>/packages/cli/bin/pong`.
pub fn resolve_pong_entry(cfg: &Config) -> io::Result<PathBuf> {
    let workspace = workspace_root();
    let candidates = [
        cfg.pong_entry.clone(),
        env_path("PONG_DESKTOP_PONG"),
        Some(workspace.join("packages").join("cli").join("bin").join("pong")),
    ];
    first_existing(candidates.into_iter().flatten()).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            format!(
                "pong CLI entry not found (looked for {}/packages/cli/bin/pong); pass --pong <path>",
                workspace.display()
            ),
        )
    })
}

pub fn user_folder(cfg: &Config) -> PathBuf {
    if let Some(path) = &cfg.user_folder {
        return path.clone();
    }
    if let Some(value) = env::var_os("PONG_USER_FOLDER") {
        return PathBuf::from(value);
    }
    workspace_root().join(".pong-data")
}

pub struct PongProcess {
    pub child: Child,
    pub url: String,
    pub port: u16,
}

/// Spawn `node <pong> start` on `127.0.0.1:<port>` with a minimal env contract.
///
/// stdin is piped so the shutdown path can close it; stdout/stderr are inherited
/// so dev mode keeps pong logs in the same terminal.
pub fn spawn(cfg: &Config, port: u16) -> io::Result<PongProcess> {
    let node = resolve_node(cfg)?;
    let entry = resolve_pong_entry(cfg)?;
    let workspace = workspace_root();
    let cwd = cfg.cwd.clone().unwrap_or(workspace);
    let port_text = port.to_string();
    let user_folder = user_folder(cfg);

    let mut command = Command::new(&node);
    command
        .arg(&entry)
        .arg("start")
        .current_dir(&cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env("PONG_PORT", &port_text)
        .env("PONG_LISTEN_ADDRESS", "127.0.0.1")
        .env("PONG_USER_FOLDER", &user_folder)
        // Desktop baseline: no telemetry, no cloud features, no POSIX permission
        // checks that cannot work on Windows.
        .env("PONG_ENFORCE_SETTINGS_FILE_PERMISSIONS", "false")
        .env("PONG_DIAGNOSTICS_ENABLED", "false")
        .env("PONG_VERSION_NOTIFICATIONS_ENABLED", "false")
        .env("PONG_TEMPLATES_ENABLED", "false")
        .env("PONG_PERSONALIZATION_ENABLED", "false")
        .env("PONG_HIRING_BANNER_ENABLED", "false")
        .env("PONG_LOG_LEVEL", &cfg.log_level)
        .env("PONG_DESKTOP_SUPERVISOR", "1");

    let child = command.spawn().map_err(|err| {
        io::Error::new(
            err.kind(),
            format!(
                "failed to spawn pong: {} {} (cwd {}): {err}",
                node.display(),
                entry.display(),
                cwd.display()
            ),
        )
    })?;

    Ok(PongProcess {
        child,
        url: crate::port::url(port),
        port,
    })
}
