//! Port selection: probe-then-handoff.
//!
//! The supervisor never hardcodes 5678. It binds `127.0.0.1:0`, reads the
//! ephemeral port, closes the probe socket, and hands the port to pong through
//! `PONG_PORT`. The window between close and pong's bind is small and local; the
//! caller retries with a new port if the child dies during startup.

use std::net::{Ipv4Addr, TcpListener};

pub fn is_free(port: u16) -> bool {
    let result = TcpListener::bind((Ipv4Addr::LOCALHOST, port)).is_ok();
    if std::env::var_os("PONG_SUPERVISOR_DEBUG").is_some() {
        eprintln!("[debug] is_free({port}) = {result}");
    }
    result
}

/// Returns a port that was free a moment ago. With `preferred`, fails instead of
/// silently moving to another port (an explicit `--port` should be respected).
pub fn pick(preferred: Option<u16>) -> std::io::Result<u16> {
    if let Some(port) = preferred {
        if is_free(port) {
            return Ok(port);
        }
        return Err(std::io::Error::new(
            std::io::ErrorKind::AddrInUse,
            format!("requested port {port} is already in use on 127.0.0.1"),
        ));
    }
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))?;
    let port = listener.local_addr()?.port();
    drop(listener);
    if port == 0 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::AddrNotAvailable,
            "OS returned ephemeral port 0",
        ));
    }
    Ok(port)
}

pub fn url(port: u16) -> String {
    format!("http://127.0.0.1:{port}")
}
