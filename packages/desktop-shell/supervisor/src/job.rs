//! Windows Job Object ownership + console control handling.
//!
//! The supervisor joins a Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`
//! *before* it spawns pong. Every descendant (pong, and later easyCode) inherits
//! the job, so if the supervisor is killed from Task Manager or crashes, the
//! kernel tears down the whole tree when the last job handle closes.
//!
//! We intentionally join our *own* process instead of assigning children one by
//! one: `AssignProcessToJobObject` after spawn races with grandchildren that a
//! child creates in between. An inherited job has no such window.
//!
//! On non-Windows targets every operation is a no-op so the crate still builds
//! for lint/CI on other platforms.

use std::io;
use std::process::Child;

#[cfg(windows)]
mod platform {
    use super::*;
    use std::ffi::c_void;
    use std::os::windows::io::AsRawHandle;
    use std::sync::atomic::{AtomicBool, Ordering};

    type Handle = *mut c_void;

    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: u32 = 0x0000_2000;
    const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS: i32 = 9;

    #[repr(C)]
    #[allow(non_snake_case)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        PerProcessUserTimeLimit: i64,
        PerJobUserTimeLimit: i64,
        LimitFlags: u32,
        MinimumWorkingSetSize: usize,
        MaximumWorkingSetSize: usize,
        ActiveProcessLimit: u32,
        Affinity: usize,
        PriorityClass: u32,
        SchedulingClass: u32,
    }

    #[repr(C)]
    #[allow(non_snake_case)]
    struct IO_COUNTERS {
        ReadOperationCount: u64,
        WriteOperationCount: u64,
        OtherOperationCount: u64,
        ReadTransferCount: u64,
        WriteTransferCount: u64,
        OtherTransferCount: u64,
    }

    #[repr(C)]
    #[allow(non_snake_case)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        BasicLimitInformation: JOBOBJECT_BASIC_LIMIT_INFORMATION,
        IoInfo: IO_COUNTERS,
        ProcessMemoryLimit: usize,
        JobMemoryLimit: usize,
        PeakProcessMemoryUsed: usize,
        PeakJobMemoryUsed: usize,
    }

    unsafe extern "system" {
        fn CreateJobObjectW(attrs: *mut c_void, name: *const u16) -> Handle;
        fn SetInformationJobObject(job: Handle, class: i32, info: *mut c_void, len: u32) -> i32;
        fn AssignProcessToJobObject(job: Handle, process: Handle) -> i32;
        fn IsProcessInJob(process: Handle, job: Handle, result: *mut i32) -> i32;
        fn GetCurrentProcess() -> Handle;
        fn CloseHandle(handle: Handle) -> i32;
        fn GetLastError() -> u32;
        fn SetConsoleCtrlHandler(
            handler: Option<unsafe extern "system" fn(u32) -> i32>,
            add: i32,
        ) -> i32;
    }

    fn last_error(context: &str) -> io::Error {
        let code = unsafe { GetLastError() };
        io::Error::new(io::ErrorKind::Other, format!("{context} (Win32 error {code})"))
    }

    /// Owns a Job Object handle. Dropping it closes the handle; with
    /// `KILL_ON_JOB_CLOSE` that kills every process still in the job.
    pub struct Job {
        handle: Handle,
    }

    impl Job {
        pub fn create_kill_on_close() -> io::Result<Self> {
            let handle = unsafe { CreateJobObjectW(std::ptr::null_mut(), std::ptr::null()) };
            if handle.is_null() {
                return Err(last_error("CreateJobObjectW failed"));
            }
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            let ok = unsafe {
                SetInformationJobObject(
                    handle,
                    JOB_OBJECT_EXTENDED_LIMIT_INFORMATION_CLASS,
                    (&mut info as *mut JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                    std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
                )
            };
            if ok == 0 {
                unsafe { CloseHandle(handle) };
                return Err(last_error("SetInformationJobObject failed"));
            }
            Ok(Job { handle })
        }

        /// Join the job before any child exists, so descendants inherit it.
        pub fn assign_self(&self) -> io::Result<()> {
            let ok = unsafe { AssignProcessToJobObject(self.handle, GetCurrentProcess()) };
            if ok == 0 {
                return Err(last_error("AssignProcessToJobObject(self) failed"));
            }
            Ok(())
        }

        /// Diagnostic: is this process already inside a job (CI, launcher)?
        pub fn self_in_job() -> bool {
            let mut inside: i32 = 0;
            let ok = unsafe { IsProcessInJob(GetCurrentProcess(), std::ptr::null_mut(), &mut inside) };
            ok != 0 && inside != 0
        }

        /// Optional: assign an already spawned child explicitly. Kept for
        /// diagnostics and for future non-inheriting launches (Tauri sidecars).
        pub fn assign_child(&self, child: &Child) -> io::Result<()> {
            let handle = child.as_raw_handle() as Handle;
            let ok = unsafe { AssignProcessToJobObject(self.handle, handle) };
            if ok == 0 {
                return Err(last_error("AssignProcessToJobObject(child) failed"));
            }
            Ok(())
        }
    }

    // NOTE: there is intentionally **no** `Drop` that closes `self.handle`.
    //
    // The supervisor itself is a member of the job. Closing the last handle while
    // the process is still running would trigger KILL_ON_JOB_CLOSE and terminate
    // the supervisor mid-`main`, discarding exit codes and stderr (observed: a
    // port-conflict error produced exit code 0 and no `[fatal]` line).
    //
    // Leaking the handle until process exit is the correct behaviour:
    //   - normal exit: pong is already stopped by `shutdown::run`;
    //   - crash/ExitProcess: the OS closes the handle, which fires
    //     KILL_ON_JOB_CLOSE and reaps every remaining descendant.
    // One leaked handle per supervisor process is an accepted cost.

    static SHUTDOWN_REQUESTED: AtomicBool = AtomicBool::new(false);

    unsafe extern "system" fn ctrl_handler(ctrl_type: u32) -> i32 {
        // 0 = CTRL_C_EVENT, 1 = CTRL_BREAK_EVENT, 2 = CTRL_CLOSE_EVENT,
        // 5 = CTRL_LOGOFF_EVENT, 6 = CTRL_SHUTDOWN_EVENT.
        let _ = ctrl_type;
        SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
        1 // handled: keep the process alive so the graceful path can run
    }

    pub fn install_ctrl_handler() -> io::Result<()> {
        let ok = unsafe { SetConsoleCtrlHandler(Some(ctrl_handler), 1) };
        if ok == 0 {
            return Err(last_error("SetConsoleCtrlHandler failed"));
        }
        Ok(())
    }

    pub fn shutdown_requested() -> bool {
        SHUTDOWN_REQUESTED.load(Ordering::SeqCst)
    }
}

#[cfg(not(windows))]
mod platform {
    use super::*;

    pub struct Job;

    impl Job {
        pub fn create_kill_on_close() -> io::Result<Self> {
            Ok(Job)
        }
        pub fn assign_self(&self) -> io::Result<()> {
            Ok(())
        }
        pub fn self_in_job() -> bool {
            false
        }
        pub fn assign_child(&self, _child: &Child) -> io::Result<()> {
            Ok(())
        }
    }

    pub fn install_ctrl_handler() -> io::Result<()> {
        Ok(())
    }

    pub fn shutdown_requested() -> bool {
        false
    }
}

pub use platform::{install_ctrl_handler, shutdown_requested, Job};
