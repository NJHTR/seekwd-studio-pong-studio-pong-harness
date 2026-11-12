//! Control-plane token generation.
//!
//! The supervisor mints a random token per launch and passes it to pong through
//! `PONG_CONTROL_TOKEN`. pong only exposes `/internal/control/*` when that env
//! var is non-empty and rejects a missing/wrong header with 401.
//!
//! No external crates: randomness comes from `BCryptGenRandom` on Windows and a
//! time/pid-mixed fallback elsewhere. `PONG_CONTROL_TOKEN` in the supervisor's
//! environment overrides generation (useful for tests and for a future Tauri
//! host that owns the token).

use std::time::{SystemTime, UNIX_EPOCH};

/// 32 random bytes, hex encoded (64 chars).
pub fn generate() -> String {
    if let Some(value) = std::env::var_os("PONG_CONTROL_TOKEN") {
        if !value.is_empty() {
            return value.to_string_lossy().into_owned();
        }
    }

    let mut bytes = [0u8; 32];

    #[cfg(windows)]
    {
        // BCryptGenRandom(NULL, buf, len, BCRYPT_USE_SYSTEM_PREFERRED_RNG)
        const BCRYPT_USE_SYSTEM_PREFERRED_RNG: u32 = 0x0000_0002;
        #[link(name = "bcrypt")]
        unsafe extern "system" {
            fn BCryptGenRandom(
                algorithm: *mut std::ffi::c_void,
                buffer: *mut u8,
                buffer_len: u32,
                flags: u32,
            ) -> i32;
        }
        let status = unsafe {
            BCryptGenRandom(
                std::ptr::null_mut(),
                bytes.as_mut_ptr(),
                bytes.len() as u32,
                BCRYPT_USE_SYSTEM_PREFERRED_RNG,
            )
        };
        if status != 0 {
            fill_fallback(&mut bytes);
        }
    }

    #[cfg(not(windows))]
    {
        fill_fallback(&mut bytes);
    }

    hex(&bytes)
}

fn fill_fallback(bytes: &mut [u8]) {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos() as u64)
        .unwrap_or(0);
    let mut state = nanos ^ ((std::process::id() as u64) << 32) ^ 0x9e37_79b9_7f4a_7c15;
    for byte in bytes.iter_mut() {
        // xorshift64*
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        *byte = (state.wrapping_mul(0x2545_f491_4f6c_dd1d) >> 33) as u8;
    }
}

fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(DIGITS[(byte >> 4) as usize] as char);
        out.push(DIGITS[(byte & 0x0f) as usize] as char);
    }
    out
}

/// Header name that carries the token for `/internal/control/*`.
pub const CONTROL_TOKEN_HEADER: &str = "x-pong-control-token";
