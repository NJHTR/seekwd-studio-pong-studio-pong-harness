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
snapshot hash of `generate-ts` and `generate-json-schema` output, and the
whitelisted method names. Regenerate and check it with:

```bash
pnpm --filter @pong/easycode-runtime build
node scripts/schema-diff.mjs --check
node scripts/schema-diff.mjs --write   # only after an intentional upgrade
```

The check fails when a whitelisted method or payload type disappears from the
generated bindings. That is the version-drift gate from ADR-08.

## M0 observations

See `docs/poc/m0-results.md` in the repository. The two behaviours a host must
not assume:

1. A second `turn/interrupt` for an already ended turn can get no response.
   Treat a timeout as "turn ended". Do not rebuild the process.
2. `thread/resume` needs a persisted rollout. A newly started thread with no
   completed turn fails with `no rollout found for thread id`.
