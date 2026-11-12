//! Minimal HTTP/1.1 client used for pong health checks and shutdown requests.
//!
//! The supervisor deliberately carries no HTTP dependency: it only talks to
//! `127.0.0.1` with plain HTTP/1.1 and closes the connection after one request.

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::Child;
use std::time::{Duration, Instant};

/// Why the readiness wait stopped before pong answered `/healthz`.
#[derive(Debug)]
pub enum WaitError {
    ChildExited(std::process::ExitStatus),
    Timeout(Duration),
}

impl std::fmt::Display for WaitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WaitError::ChildExited(status) => write!(f, "pong exited during startup ({status})"),
            WaitError::Timeout(limit) => write!(f, "pong did not answer /healthz within {limit:?}"),
        }
    }
}

/// Polls `GET /healthz` until a 2xx arrives. Fails fast if the child exits, so a
/// misconfigured node/pong path reports in seconds instead of waiting the full
/// timeout.
pub fn wait_ready(port: u16, timeout: Duration, child: &mut Child) -> Result<Duration, WaitError> {
    let started = Instant::now();
    loop {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(WaitError::ChildExited(status));
        }
        if started.elapsed() >= timeout {
            return Err(WaitError::Timeout(timeout));
        }
        match get(port, "/healthz", Duration::from_millis(1500)) {
            Ok(code) if (200..300).contains(&code) => return Ok(started.elapsed()),
            Ok(_) => {}
            Err(_) => {}
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}

fn request(port: u16, method: &str, path: &str, timeout: Duration) -> std::io::Result<u16> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = TcpStream::connect_timeout(&addr, timeout)?;
    stream.set_read_timeout(Some(timeout))?;
    stream.set_write_timeout(Some(timeout))?;

    let body = "";
    let req = format!(
        "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nUser-Agent: pong-desktop-supervisor/0.1\r\nAccept: */*\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(req.as_bytes())?;
    stream.flush()?;

    let mut buf = [0u8; 2048];
    let n = stream.read(&mut buf)?;
    if n == 0 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::UnexpectedEof,
            "empty HTTP response",
        ));
    }
    let text = String::from_utf8_lossy(&buf[..n]);
    let first = text.lines().next().unwrap_or_default();
    let mut parts = first.split_whitespace();
    let _proto = parts.next();
    let code = parts
        .next()
        .unwrap_or_default()
        .parse::<u16>()
        .map_err(|_| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("malformed status line: {first:?}"),
            )
        })?;
    Ok(code)
}

/// `GET /healthz` (and any other GET path) -> HTTP status code.
pub fn get(port: u16, path: &str, timeout: Duration) -> std::io::Result<u16> {
    request(port, "GET", path, timeout)
}

/// Best-effort `POST` used for an optional shutdown control endpoint.
///
/// pong has no `/internal/shutdown` endpoint yet (M3 item), so callers must
/// treat any error or non-2xx response as "graceful path unavailable" and fall
/// back to closing stdin + killing the tree.
pub fn post(port: u16, path: &str, timeout: Duration) -> std::io::Result<u16> {
    request(port, "POST", path, timeout)
}
