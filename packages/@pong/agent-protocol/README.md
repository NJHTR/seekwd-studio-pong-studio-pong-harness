# @pong/agent-protocol

Frozen multi-agent protocol **v0.1** for pong-studio + easyCode. This package owns the
wire contract only: envelope validation, the six message kinds, content-addressed
artifact references, and the adaptive handoff selector.

Source of truth: [`docs/architecture/agent-protocol-v0.1.md`](../../../docs/architecture/agent-protocol-v0.1.md)
(decisions: ADR-001 §6/§10.3, data: `docs/poc/m1-ab-baseline.md`).

## What it does

- Validate envelopes and messages with Zod (`parseMessage`, `safeParseMessage`).
- Build `artifact://sha256/<64hex>` references and manifests; verify content hashes.
- Create ULIDs and deterministic `sha256:` idempotency keys.
- Choose between prose and artifact handoff (`selectHandoff`): prose by default at a
  600-code-point budget; artifact when the payload is larger, touches more than three
  files, or needs byte/diff/manifest fidelity.

## What it does not do

No transport, no storage, no queue, no scheduler, no version negotiation, no progress
messages, no lease/heartbeat. Those belong to `@pong/easycode-runtime` and the pong
orchestrator (M2-B).

## Usage

```ts
import { createIdempotencyKey, createUlid, parseMessage, selectHandoff } from '@pong/agent-protocol';

const message = parseMessage({
	protocol: 'pong.agent/0.1',
	kind: 'conclusion_proposed',
	id: createUlid(),
	sent_at: new Date().toISOString(),
	from: { agent_id: 'coder.1', role: 'coder' },
	to: { agent_id: 'reviewer.1' },
	task_id: createUlid(),
	idempotency_key: createIdempotencyKey('task_impl', 'conclusion', '1'),
	payload: {
		claim: 'AC-1 passes',
		evidence: ['command:pnpm --filter pong-nodes-base test'],
		confidence: 0.9,
	},
});

const handoff = selectHandoff({ prose: summary, fileCount: changedFiles.length });
```

```ts
import { createArtifactManifest, verifyArtifactContent } from '@pong/agent-protocol';

const manifest = createArtifactManifest({
	content: diff,
	media_type: 'application/vnd.pong.patch+unified-diff',
	summary: 'three files changed',
});
verifyArtifactContent(manifest, diff); // true
```

Fixtures for tests: `import { makeFixtureMessage } from '@pong/agent-protocol/testing';`.

## Development

```bash
pnpm --filter @pong/agent-protocol test
pnpm --filter @pong/agent-protocol typecheck
pnpm --filter @pong/agent-protocol build
```
