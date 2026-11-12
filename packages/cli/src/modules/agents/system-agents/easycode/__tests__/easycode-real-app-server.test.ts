import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Logger } from '@pong/backend-common';
import type { StreamChunk } from '@pong/agents';
import { resolveDefaultExePath } from '@pong/easycode-runtime';

import { EasycodeApprovalBridge } from '../approval-bridge';
import { EasycodeArtifactBridge, type EasycodeArtifactManifest } from '../artifact-bridge';
import { EasycodeDynamicToolset } from '../dynamic-tools';
import { EasycodeRuntimeAgent } from '../easycode-runtime-agent';
import type {
	EasycodeApprovalDecision,
	EasycodeApprovalRequest,
	EasycodeSupervisorPort,
} from '../easycode-supervisor.port';
import { EasycodeSupervisorFactoryService } from '../easycode-supervisor-factory.service';
import { EasycodeThreadStateStore } from '../thread-state';

const EXE = resolveDefaultExePath();
const ENABLED = process.env.PONG_EASYCODE_REAL_E2E === '1' && EXE !== null;

const noopLogger = {
	scoped: () => ({ debug: () => undefined, warn: () => undefined, error: () => undefined }),
} as unknown as Logger;

async function readChunks(stream: ReadableStream<StreamChunk>): Promise<StreamChunk[]> {
	const reader = stream.getReader();
	const chunks: StreamChunk[] = [];
	for (;;) {
		const next = await reader.read();
		if (next.done) return chunks;
		chunks.push(next.value);
	}
}

/**
 * One real easyCode task: read, write a file, run a command. It needs the real
 * binary and its model configuration, so it runs only with
 * `PONG_EASYCODE_REAL_E2E=1`. It asserts that the approval events, the artifact
 * manifest and the final stream reach the host.
 */
describe.skipIf(!ENABLED)('easyCode real app-server', () => {
	let workspace: string;

	beforeEach(async () => {
		// Read-only makes every write an approval, so a real model must ask.
		process.env.PONG_EASYCODE_SANDBOX = 'read-only';
		workspace = await mkdtemp(join(tmpdir(), 'pong-easycode-e2e-'));
		await writeFile(join(workspace, 'README.md'), 'the pong e2e workspace\n', 'utf8');
		execFileSync('git', ['init'], { cwd: workspace, windowsHide: true });
	});

	afterEach(async () => {
		delete process.env.PONG_EASYCODE_SANDBOX;
		await rm(workspace, { recursive: true, force: true });
	});

	it('runs one read-modify-run task with a visible approval', async () => {
		const emitter = {
			events: [] as Array<{ name: string; payload: unknown }>,
			emit: (name: string, payload?: unknown) => {
				emitter.events.push({ name, payload });
			},
		};
		const approvals: EasycodeApprovalRequest[] = [];
		const decisions: EasycodeApprovalDecision[] = [];
		let supervisor: EasycodeSupervisorPort | null = null;
		const bridge = new EasycodeApprovalBridge({
			threadId: 'real-e2e',
			emit: emitter.emit as never,
			grants: { load: async () => new Set(), grant: async () => undefined },
			decide: (approvalId, decision) => {
				decisions.push(decision);
				return supervisor?.decideApproval(approvalId, decision) ?? false;
			},
			timeoutMs: 120_000,
		});
		await bridge.loadGrants();
		const toolset = new EasycodeDynamicToolset({
			threadId: 'real-e2e',
			tools: [],
			approver: { ask: async () => 'accept' },
			emit: emitter.emit as never,
		});
		const artifacts = new EasycodeArtifactBridge({
			threadId: 'real-e2e',
			emit: emitter.emit as never,
			// Test sink: the bytes exist on disk, so the manifest is checkable.
			sink: {
				store: async ({ bytes }) => {
					const sha = createHash('sha256').update(bytes).digest('hex');
					await writeFile(join(workspace, `real-e2e-${sha}.patch`), bytes);
					return { fileId: `local:${sha}` };
				},
			},
		});
		const factory = new EasycodeSupervisorFactoryService(noopLogger);
		supervisor = factory.create({
			threadId: 'real-e2e',
			cwd: workspace,
			exePath: EXE ?? '',
			handlers: {
				onApprovalRequest: (request) => {
					approvals.push(request);
					// Accept everything at once, as an interactive user would.
					setTimeout(() => bridge.resolve(request.approvalId, 'accept'), 20);
				},
				onDynamicToolCall: async (call) => await toolset.handle(call),
			},
		});
		const agent = new EasycodeRuntimeAgent({
			threadId: 'real-e2e',
			cwd: workspace,
			supervisor,
			toolset,
			artifactBridge: artifacts,
			approvalBridge: bridge,
			threadStateStore: EasycodeThreadStateStore.forHome(supervisor.easycodeHome),
			emitHostEvent: emitter.emit as never,
		});

		await agent.prepare();
		const run = await agent.stream(
			"Do these steps in the current directory:\n1. Create a file named hello.txt with the text OK.\n2. Run the command \"node -e \\\"require('fs').readFileSync('hello.txt','utf8'); console.log(1)\\\"\" .\nThen reply with the single word DONE.",
		);
		const chunks = await readChunks(run.stream);
		await agent.close();

		const finish = chunks.at(-1);
		expect(finish).toMatchObject({ type: 'finish' });
		expect(approvals.length).toBeGreaterThan(0);
		expect(decisions.length).toBeGreaterThan(0);
		const requested = emitter.events.find((event) => event.name === 'easycode-approval-requested')
			?.payload as { approvalId?: string; requestKind?: string; expiresAtMs?: number } | undefined;
		expect(requested?.approvalId).toEqual(approvals[0]?.approvalId);
		expect(typeof requested?.expiresAtMs).toBe('number');
		const artifact = emitter.events.find((event) => event.name === 'easycode-artifact')?.payload as
			| EasycodeArtifactManifest
			| undefined;
		expect(artifact?.sha256).toMatch(/^[a-f0-9]{64}$/);
		expect(artifact?.threadId).toBe('real-e2e');
		expect(artifact?.fileId).toMatch(/^local:[a-f0-9]{64}$/);
		// Record the observable sequence for the report.
		const sequence = emitter.events.map((event) => event.name);
		expect(sequence).toContain('easycode-approval-requested');
		expect(sequence).toContain('easycode-approval-decided');
		expect(sequence).toContain('easycode-artifact');
	}, 240_000);
});
