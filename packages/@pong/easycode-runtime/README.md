# @pong/easycode-runtime

Protocol client and process supervisor for the easyCode app-server. This is the
M0 skeleton from ADR-001. The package talks to one child process:

```
easycode app-server --listen stdio://
```

## Why the transport is not JSON-RPC 2.0

easyCode sends a custom JSONL envelope (easyCode `app-server-protocol/src/rpc.rs`):

| message | shape |
|---|---|
| request | `{"id": <string\|number>, "method": "...", "params": ...}` |
| response | `{"id": ..., "result": ...}` or `{"id": ..., "error": {"code": ..., "message": ...}}` |
| notification | `{"method": "...", "params": ...}` |

The `jsonrpc: "2.0"` field is never present. `src/protocol/envelopes.ts` mirrors
the Rust structs.

## Read-loop contract (ADR-02)

`JsonlTransport` parses one stdout line and dispatches it synchronously. It never
awaits inside the read loop:

- Notifications go into a bounded in-memory queue (`maxQueuedNotifications`,
  default 4096). The oldest entry is dropped and counted when the queue is full.
- Server requests go to listeners. A listener may be async, but the transport
  only attaches a rejection handler and keeps reading.
- Writes use a queue plus `drain` handling. A full stdin pipe never blocks the
  read path.

## Package layout

| file | role |
|---|---|
| `src/protocol/` | whitelisted subset of `generate-ts` output, guards, and parsers |
| `src/transport.ts` | JSONL line decoder, request correlation, bounded notification queue |
| `src/approval.ts` | pending approvals with the 120s decline timeout |
| `src/supervisor.ts` | spawn, handshake, turn helpers, interrupt, shutdown, Job Object seam |
| `src/index.ts` | public exports |

## Tests

The unit tests use a fake app-server (`test/fixtures/fake-app-server.mjs`) that
speaks the same envelope. It covers request correlation, timeouts, bounded
queues, non-blocking dispatch, approvals, dynamic tool calls, interrupt
fallbacks, and the kill-tree shutdown path.

```bash
pnpm --filter @pong/easycode-runtime test
pnpm --filter @pong/easycode-runtime typecheck
pnpm --filter @pong/easycode-runtime lint
```

## Locked protocol surface

`runtime.lock.json` records the easyCode version, `easycode.exe` sha256, the
snapshot hash of `generate-ts` and `generate-json-schema` output, the
whitelisted method names, and the hash of this package's `src/protocol/` subset.
Regenerate and check it with:

```bash
pnpm --filter @pong/easycode-runtime build
node scripts/schema-diff.mjs --check
node scripts/schema-diff.mjs --write   # only after an intentional upgrade
```

The check fails when a whitelisted method or payload type disappears from the
generated bindings, when the runtime protocol subset changes, or when the
generated `SandboxPolicy` shape no longer matches the lock. That is the
version-drift gate from ADR-08.

### SandboxPolicy.networkAccess is a boolean

The real binary accepts only a boolean for `workspaceWrite.networkAccess`
(`{ type: "workspaceWrite", writableRoots, networkAccess: false, ... }`). A
string such as `"restricted"` fails with:

```
turn/start: Invalid request: invalid type: string "restricted", expected a boolean
```

`test/real-binary.test.ts` checks both paths on a real binary. The suite skips
when the binary is missing or `PONG_SKIP_REAL_CONTRACT=1` is set.

## Shared home and first-run recovery

Concurrent agents that share one `EASYCODE_HOME` can lose the first SQLite
initialization race. The server prints
`failed to initialize sqlite state runtime` and exits 1 without retrying.

`AppServerSupervisor` handles this in three layers:

1. **Retry classification.** A handshake failure is retryable when the error or
   the captured stderr tail contains a SQLite init/contention marker. Other
   failures (bad config, missing exe) fail immediately.
2. **Exponential backoff restart.** Default: 5 restarts, 200 ms first delay,
   doubling, capped at 5 s. `initAttempts` / `initFailures` / `lastInitFailure`
   / `lastStderr` expose the state. When the limit is reached the supervisor
   throws `SupervisorInitError` with `attempts`, `retries`, and `stderrTail`.
3. **Shared-home first-start serialization.** In `shared` mode the first start
   takes `<home>/.pong-runtime-init.lock`, and on success writes
   `<home>/.pong-runtime-init.ready`. Later starts skip the lock. Stale locks
   older than 60 s are removed. The lock is best-effort across host processes;
   the retry layer covers residual races.

### Home modes

`homeMode` option or `PONG_EASYCODE_HOME_MODE` selects the strategy:

| mode | behavior |
|---|---|
| `per-run` (default) | Every start creates a fresh home under the runs root and removes it when the run ends (success, failure, or crash). No session or rollout data survives the run. |
| `shared` | All agents use one home. First start is serialized; retry covers contention. |
| `per-agent` | Each supervisor gets `<base>/agents/<agentId>` as `EASYCODE_HOME`. `config.toml`, `auth.json`, and `installation_id` are copied from the base home when missing. |

`agentId` defaults to `agent-<pid>-<random>`. The ready marker and lock files
live only in `shared` mode. Delete the marker to force re-serialization.

## Per-run home lifecycle

easyCode `workspaceWrite` only limits writes. Reads of absolute paths are not
restricted, so a later agent can read a sibling agent's rollout JSONL under a
shared home and recover handed-off values (see `docs/poc/m1-ab-baseline.md`).
The per-run home removes the target of that read after the run.

```ts
import {
  createRunHome,
  cleanupRunHome,
  cleanupStaleRunHomes,
} from '@pong/easycode-runtime';

const runHome = await createRunHome({ baseHome: 'C:/Users/me/.easycode' });
// runHome.home = <os.tmpdir()>/pong-easycode-runs/run-<time>-<random>
// config.toml / auth.json / installation_id are seeded, session data is not.
try {
  await runAgentWithHome(runHome.home);
} finally {
  await cleanupRunHome(runHome);
}
```

With `homeMode: 'per-run'` the supervisor does this automatically:

- Before the first start it removes stale run homes older than 24 h
  (`runHomeTtlMs`, default 24 h, or `PONG_EASYCODE_RUNS_ROOT` for the parent
  directory).
- It creates the home before each initialize attempt and passes it as the child
  `EASYCODE_HOME`. A failed attempt discards its home; the next attempt gets a
  fresh one.
- `shutdown()` removes the home (`steps` contains `run-home-cleaned`). A crash
  triggers the same cleanup from the child exit handler.
- `runHomePath` exposes the current path; `healthCheck().runHome` reports it.

Trade-off: a per-run home deletes the thread rollout and session DBs, so
`thread/resume` across supervisor restarts is not possible. Use `shared` or
`per-agent` when resumability is required, and accept the read-isolation risk
documented in `docs/architecture/easycode-isolation.md`. `per-agent` still
retains sessions between runs.

Smoke test without a real binary or model:

```bash
pnpm --filter @pong/easycode-runtime build
node scripts/poc/isolation-smoke.mjs --smoke
```


## M0 observations

See `docs/poc/m0-results.md` and `docs/poc/m0-fault-injection.md` in the
repository. Behaviours a host must not assume:

1. A second `turn/interrupt` for an interrupted turn can get no response.
   Treat a timeout as "turn ended". Do not rebuild the process. A naturally
   completed turn still returns `-32600 invalid_request: no active turn`.
2. `thread/resume` needs a persisted rollout. A newly started thread with no
   completed turn fails with `no rollout found for thread id`.
3. `thread/resume` does not validate workspace contents. The host must check
   the workspace state itself.
4. Concurrent first starts on a shared home can fail; use the retry layer or
   `per-agent` mode.
