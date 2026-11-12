//! Loopback control plane client: `GET /internal/control/health` and
//! `POST /internal/control/shutdown` with `x-pong-control-token`.
//!
//! pong replies with:
//!   - 404 when `PONG_CONTROL_TOKEN` is empty (endpoints disabled);
//!   - 403 for a non-loopback caller;
//!   - 401 for a missing/wrong token;
//!   - 200 `{"status":"ok"|"shutting-down",...}` for health;
//!   - 202 `{"accepted":true}` for shutdown, then it runs graceful shutdown.
//!
//! The supervisor must never infer success from a generic 200: the editor's SPA
//! catch-all also answers unknown requests with 200 + HTML. Only a 202 from the
//! POST counts, and the health probe parses the `status` field.

use std::time::Duration;

use crate::health::{self, Response};

#[derive(Debug, Clone)]
pub struct ControlHealth {
    pub status: String,
    pub pid: Option<i64>,
}

#[derive(Debug)]
pub enum ControlError {
    Transport(std::io::Error),
    /// Endpoints disabled (404): `PONG_CONTROL_TOKEN` did not reach pong.
    NotConfigured,
    /// Token mismatch (401) or non-loopback (403).
    Unauthorized(u16),
    /// Any other status.
    Unexpected(u16),
}

impl std::fmt::Display for ControlError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ControlError::Transport(err) => write!(f, "transport error: {err}"),
            ControlError::NotConfigured => {
                write!(f, "control endpoints are disabled (404); PONG_CONTROL_TOKEN missing")
            }
            ControlError::Unauthorized(code) => {
                write!(f, "control token rejected (HTTP {code})")
            }
            ControlError::Unexpected(code) => write!(f, "unexpected control response (HTTP {code})"),
        }
    }
}

fn classify(response: Response) -> Result<Response, ControlError> {
    match response.status {
        200..=202 => Ok(response),
        401 | 403 => Err(ControlError::Unauthorized(response.status)),
        404 => Err(ControlError::NotConfigured),
        other => Err(ControlError::Unexpected(other)),
    }
}

/// Minimal extraction of a JSON string field from a flat object.
/// Good enough for `{"status":"ok","pid":123}`; no JSON dependency on purpose.
fn json_string_field(body: &str, field: &str) -> Option<String> {
    let needle = format!("\"{field}\"");
    let start = body.find(&needle)? + needle.len();
    let rest = body[start..].trim_start();
    let rest = rest.strip_prefix(':')?.trim_start();
    let rest = rest.strip_prefix('"')?;
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn json_number_field(body: &str, field: &str) -> Option<i64> {
    let needle = format!("\"{field}\"");
    let start = body.find(&needle)? + needle.len();
    let rest = body[start..].trim_start();
    let rest = rest.strip_prefix(':')?.trim_start();
    let digits: String = rest.chars().take_while(|ch| ch.is_ascii_digit() || *ch == '-').collect();
    digits.parse().ok()
}

pub fn health(port: u16, token: &str, timeout: Duration) -> Result<ControlHealth, ControlError> {
    let response = health::get_with_token(port, "/internal/control/health", token, timeout)
        .map_err(ControlError::Transport)?;
    let response = classify(response)?;
    let status = json_string_field(&response.body, "status").unwrap_or_else(|| "unknown".into());
    Ok(ControlHealth {
        status,
        pid: json_number_field(&response.body, "pid"),
    })
}

/// Returns the HTTP status (expected 202). Any other result is a failure the
/// caller must treat as "graceful shutdown not accepted".
pub fn shutdown(port: u16, token: &str, timeout: Duration) -> Result<u16, ControlError> {
    let response = health::post_with_token(port, "/internal/control/shutdown", token, timeout)
        .map_err(ControlError::Transport)?;
    let response = classify(response)?;
    Ok(response.status)
}

/// Probes without a token; used by self-test to prove 401 is enforced and never
/// mistaken for an accepted shutdown.
pub fn health_without_token(
    port: u16,
    timeout: Duration,
) -> Result<u16, ControlError> {
    let response = health::get(port, "/internal/control/health", timeout)
        .map_err(ControlError::Transport)?;
    match response.status {
        401 | 403 => Ok(response.status),
        404 => Err(ControlError::NotConfigured),
        other => Err(ControlError::Unexpected(other)),
    }
}
