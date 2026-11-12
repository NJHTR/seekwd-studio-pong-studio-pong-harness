import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { StreamChunk } from '@pong/agents';
import type { Logger } from '@pong/backend-common';
import type { AuthenticatedRequest, User } from '@pong/db';
import { resolveDefaultExePath } from '@pong/easycode-runtime';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../../agent-chat-attachment.service';
import type { AgentChatExecutionService } from '../../../agent-chat-execution.service';
import type { AgentChatRelayService } from '../../../agent-chat-relay.service';
import type { AgentExecutionOrchestratorService } from '../../../agent-execution-orchestrator.service';
import type { AgentMessageQueueService } from '../../../agent-message-queue.service';
import type { AgentExecutionThread } from '../../../entities/agent-execution-thread.entity';
import type { PONGCheckpointStorage } from '../../../integrations/pong-checkpoint-storage';
import type { PongMemory } from '../../../integrations/pong-memory';
import { SystemAgentChatController } from '../../system-agent-chat.controller';
import type { SystemAgentExecutionService } from '../../system-agent-execution.service';
import { EasycodeApprovalBridge } from '../approval-bridge';
import { EasycodeApprovalRegistry } from '../easycode-approval-registry';
import { EasycodeArtifactBridge, type EasycodeArtifactManifest } from '../artifact-bridge';
import { EasycodeDynamicToolset } from '../dynamic-tools';
import { EasycodeRuntimeAgent } from '../easycode-runtime-agent';
import type { EasycodeApprovalRequest, EasycodeSupervisorPort } from '../easycode-supervisor.port';
import { EasycodeSupervisorFactoryService } from '../easycode-supervisor-factory.service';
import { EasycodeThreadStateStore } from '../thread-state';

const EXE = resolveDefaultExePath();
const ENABLED = process.env.PONG_EASYCODE_REAL_E2E === '1' && EXE !== null;
const THREAD_ID = 'thread-real-e2e';
const AGENT_ID = 'easycode';

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
 * One real easyCode task that must run a shell command. It needs the real
 * binary and its model configuration, so it runs only with
 * `PONG_EASYCODE_REAL_E2E=1`.
 *
 * The approval policy `untrusted` asks before every command (a test seam of the
 * adapter). The test accepts the request through the same controller handler
 * that the HTTP decision endpoint uses, and asserts the turn continues and
 * finishes. It also records the host-event and notification sequence, so the
 * report can show the real exchange.
 */
describe.skipIf(!ENABLED)('easyCode real approval round-trip', () => {
	let workspace: string;

	beforeEach(async () => {
		process.env.PONG_EASYCODE_APPROVAL_POLICY = 'untrusted';
		delete process.env.PONG_EASYCODE_SANDBOX;
		workspace = await mkdtemp(join(tmpdir(), 'pong-easycode-approval-'));
		await writeFile(join(workspace, 'README.md'), 'the pong approval workspace\n', 'utf8');
		execFileSync('git', ['init'], { cwd: workspace, windowsHide: true });
	});

	afterEach(async () => {
		delete process.env.PONG_EASYCODE_APPROVAL_POLICY;
		await rm(workspace, { recursive: true, force: true });
	});

	it('asks for the command, accepts it through the endpoint, and finishes', async () => {
		const events: Array<{ name: string; payload: unknown }> = [];
		const notifications: string[] = [];
		const approvals: EasycodeApprovalRequest[] = [];
		const decisionRoundtripsMs: number[] = [];
		let supervisor: EasycodeSupervisorPort | null = null;

		const bridge = new EasycodeApprovalBridge({
			threadId: THREAD_ID,
			emit: (name, payload) => {
				events.push({ name, payload });
			},
			grants: { load: async () => new Set(), grant: async () => undefined },
			decide: (approvalId, decision) => supervisor?.decideApproval(approvalId, decision) ?? false,
			timeoutMs: 120_000,
		});
		await bridge.loadGrants();

		const registry = new EasycodeApprovalRegistry();
		registry.register(THREAD_ID, bridge);
		const systemAgents = mock<SystemAgentExecutionService>();
		systemAgents.getUsableThread.mockResolvedValue({
			id: THREAD_ID,
			projectId: 'project-1',
		} as AgentExecutionThread);
		const controller = new SystemAgentChatController(
			systemAgents,
			mock<AgentChatRelayService>(),
			mock<AgentMessageQueueService>(),
			mock<AgentChatExecutionService>(),
			mock<AgentExecutionOrchestratorService>(),
			mock<PONGCheckpointStorage>(),
			mock<AgentChatAttachmentService>(),
			mock<PongMemory>(),
			registry,
		);
		const httpRequest = { user: { id: 'user-1' } as User } as unknown as AuthenticatedRequest;

		const toolset = new EasycodeDynamicToolset({
			threadId: THREAD_ID,
			tools: [],
			approver: { ask: async () => 'accept' },
		});
		const artifacts = new EasycodeArtifactBridge({
			threadId: THREAD_ID,
			emit: (name, payload) => {
				events.push({ name, payload });
			},
			sink: {
				store: async ({ bytes }) => {
					const sha = createHash('sha256').update(bytes).digest('hex');
					await writeFile(join(workspace, `approval-${sha}.patch`), bytes);
					return { fileId: `local:${sha}` };
				},
			},
		});
		const factory = new EasycodeSupervisorFactoryService(noopLogger);
		supervisor = factory.create({
			threadId: THREAD_ID,
			cwd: workspace,
			exePath: EXE ?? '',
			handlers: {
				onApprovalRequest: (request) => {
					approvals.push(request);
					bridge.request(request);
				},
				onDynamicToolCall: async (call) => await toolset.handle(call),
			},
		});
		const agent = new EasycodeRuntimeAgent({
			threadId: THREAD_ID,
			cwd: workspace,
			supervisor,
			toolset,
			artifactBridge: artifacts,
			approvalBridge: bridge,
			threadStateStore: EasycodeThreadStateStore.forHome(supervisor.easycodeHome),
			emitHostEvent: (name, payload) => {
				events.push({ name, payload });
			},
		});

		await agent.prepare();

		// Answer each real approval through the controller handler and record the
		// round-trip, as the UI does through the HTTP endpoint.
		let answering = false;
		const answerPending = async () => {
			if (answering) return;
			const pending = bridge.pendingList();
			if (pending.length === 0) return;
			answering = true;
			const receivedAt = Date.now();
			for (const entry of pending) {
				const result = await controller.decideApproval(
					httpRequest,
					AGENT_ID,
					THREAD_ID,
					entry.approvalId,
					{ decision: 'accept' },
				);
				decisionRoundtripsMs.push(Date.now() - receivedAt);
				expect(result).toEqual({ ok: true });
			}
			answering = false;
		};
		const timer = setInterval(() => {
			void answerPending();
		}, 15);
		timer.unref();

		// Record the raw app-server notifications and host events, so a run that
		// asks for no approval still gives evidence of what the model did.
		supervisor.onNotification((notification) => {
			notifications.push(notification.method);
			if (notification.method === 'turn/completed' || notification.method === 'turn/failed') {
				events.push({ name: `raw:${notification.method}`, payload: notification.params });
			}
			if (notification.method === 'item/completed') {
				events.push({ name: 'raw:item/completed', payload: notification.params });
			}
		});

		try {
			const run = await agent.stream(
				[
					'You must use the shell to run exactly this command in the current directory:',
					'node -e "console.log(\'pong-approval-e2e\')"',
					'After the command succeeds, reply with the single word DONE. Do not change any file.',
				].join('\n'),
			);
			const chunks = await readChunks(run.stream);
			const finish = chunks.at(-1);
			const text = chunks
				.filter(
					(chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> =>
						chunk.type === 'text-delta',
				)
				.map((chunk) => chunk.delta)
				.join('');
			console.log(
				JSON.stringify(
					{
						finish,
						text,
						approvals: approvals.map((entry) => ({
							approvalId: entry.approvalId,
							kind: entry.kind,
							command: entry.command,
						})),
						decisionRoundtripsMs,
						hostEvents: events.map((event) => event.name),
						notifications,
						raw: events.filter((event) => event.name.startsWith('raw:')),
					},
					null,
					2,
				),
			);
			expect(finish).toMatchObject({ type: 'finish' });
			expect(finish).toMatchObject({ type: 'finish', finishReason: 'stop' });
			expect(approvals.length).toBeGreaterThan(0);
			const approval = approvals[0];
			expect(approval?.kind).toBe('commandExecution');
			expect(decisionRoundtripsMs.length).toBeGreaterThan(0);
			expect(decisionRoundtripsMs[0]).toBeLessThan(5_000);

			const requested = events.find((event) => event.name === 'easycode-approval-requested')
				?.payload as
				| { approvalId?: string; requestKind?: string; expiresAtMs?: number }
				| undefined;
			expect(requested?.requestKind).toBe('command');
			expect(typeof requested?.expiresAtMs).toBe('number');
			const decided = events.find((event) => event.name === 'easycode-approval-decided');
			expect(decided).toBeDefined();

			const artifact = events.find((event) => event.name === 'easycode-artifact')?.payload as
				| EasycodeArtifactManifest
				| undefined;
			if (artifact !== undefined) {
				expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
				expect(artifact.threadId).toBe(THREAD_ID);
			}

			// Diagnostics for the report.
			console.log(
				JSON.stringify(
					{
						approvals: approvals.map((entry) => ({
							approvalId: entry.approvalId,
							kind: entry.kind,
							command: entry.command,
							reason: entry.reason,
						})),
						decisionRoundtripsMs,
						events: events.map((event) => event.name),
						notifications,
						text: chunks
							.filter(
								(chunk): chunk is Extract<StreamChunk, { type: 'text-delta' }> =>
									chunk.type === 'text-delta',
							)
							.map((chunk) => chunk.delta)
							.join(''),
					},
					null,
					2,
				),
			);
			expect(notifications).toBeDefined();
		} finally {
			clearInterval(timer);
			await agent.close();
		}
	}, 300_000);
});
