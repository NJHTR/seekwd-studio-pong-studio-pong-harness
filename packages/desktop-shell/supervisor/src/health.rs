//! Minimal HTTP/1.1 client for the loopback pong server.
//!
//! No HTTP dependency: single request, `Connection: close`, small bounded body.
//! Used for liveness/readiness polling, the control-plane health probe, and the
//! shutdown request.

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::Child;
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct Response {
    pub status: u16,
    pub body: String,
}

fn request(
    port: u16,
    method: &str,
    path: &str,
    headers: &[(&str, &str)],
    timeout: Duration,
) -> std::io::Result<Response> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = TcpStream::connect_timeout(&addr, timeout)?;
    stream.set_read_timeout(Some(timeout))?;
    stream.set_write_timeout(Some(timeout))?;

    let mut head = format!(
        "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nUser-Agent: pong-desktop-supervisor/0.2\r\nAccept: application/json, */*\r\nContent-Length: 0\r\nConnection: close\r\n"
    );
    for (name, value) in headers {
        head.push_str(name);
        head.push_str(": ");
        head.push_str(value);
        head.push_str("\r\n");
    }
    head.push_str("\r\n");
    stream.write_all(head.as_bytes())?;
    stream.flush()?;

    // Read the whole response (the server closes the socket). Bounded to 64 KiB.
    let mut raw = Vec::with_capacity(1024);
    let mut buf = [0u8; 4096];
    loop {
        match stream.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                raw.extend_from_slice(&buf[..n]);
                if raw.len() > 64 * 1024 {
                    break;
                }
            }
            Err(err) => {
                if raw.is_empty() {
                    return Err(err);
                }
                break;
            }
        }
    }

    let text = String::from_utf8_lossy(&raw);
    let (head, body) = match text.split_once("\r\n\r\n") {
        Some((head, body)) => (head, body),
        None => (text.as_ref(), ""),
    };
    let status_line = head.lines().next().unwrap_or_default();
    let mut parts = status_line.split_whitespace();
    let _proto = parts.next();
    let status = parts
        .next()
        .unwrap_or_default()
        .parse::<u16>()
        .map_err(|_| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("malformed status line: {status_line:?}"),
            )
        })?;
    Ok(Response {
        status,
        body: body.to_string(),
    })
}

pub fn get(port: u16, path: &str, timeout: Duration) -> std::io::Result<Response> {
    request(port, "GET", path, &[], timeout)
}

pub fn get_with_token(
    port: u16,
    path: &str,
    token: &str,
    timeout: Duration,
) -> std::io::Result<Response> {
    request(
        port,
        "GET",
        path,
        &[(crate::token::CONTROL_TOKEN_HEADER, token)],
        timeout,
    )
}

pub fn post_with_token(
    port: u16,
    path: &str,
    token: &str,
    timeout: Duration,
) -> std::io::Result<Response> {
    request(
        port,
        "POST",
        path,
        &[(crate::token::CONTROL_TOKEN_HEADER, token)],
        timeout,
    )
}

/// Why a readiness wait stopped before the endpoint answered 2xx.
#[derive(Debug)]
pub enum WaitError {
    ChildExited(std::process::ExitStatus),
    Timeout { path: String, limit: Duration },
}

impl std::fmt::Display for WaitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WaitError::ChildExited(status) => write!(f, "pong exited during startup ({status})"),
            WaitError::Timeout { path, limit } => {
                write!(f, "pong did not answer {path} with 2xx within {limit:?}")
            }
        }
    }
}

/// Polls `path` until a 2xx arrives. Fails fast if the child exits.
pub fn wait_for_2xx(
    port: u16,
    path: &str,
    timeout: Duration,
    child: &mut Child,
) -> Result<Duration, WaitError> {
    let started = Instant::now();
    loop {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(WaitError::ChildExited(status));
        }
        if started.elapsed() >= timeout {
            return Err(WaitError::Timeout {
                path: path.to_string(),
                limit: timeout,
            });
        }
        if let Ok(response) = get(port, path, Duration::from_millis(1500)) {
            if (200..300).contains(&response.status) {
                return Ok(started.elapsed());
            }
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}
