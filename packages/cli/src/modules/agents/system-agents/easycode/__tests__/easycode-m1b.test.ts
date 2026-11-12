import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { mock } from 'vitest-mock-extended';

import type { SystemAgentHostEventEmitter } from '../../system-agent-host-events';
import { EasycodeApprovalBridge } from '../approval-bridge';
import { EasycodeArtifactBridge, parsePatchFiles } from '../artifact-bridge';
import { EasycodeAttachmentArtifactSink } from '../artifact-sink';
import { EasycodeDynamicToolset } from '../dynamic-tools';
import { EasycodeEventProjector } from '../event-projection';
import { EasycodeThreadStateStore, planResume, type EasycodeThreadState } from '../thread-state';
import type { AgentChatAttachmentService } from '../../../agent-chat-attachment.service';

function collector(): {
	emit: SystemAgentHostEventEmitter;
	events: Array<{ name: string; payload: unknown; key?: string }>;
} {
	const events: Array<{ name: string; payload: unknown; key?: string }> = [];
	const emit: SystemAgentHostEventEmitter = (name, payload, options) => {
		events.push({ name, payload, ...(options?.key !== undefined ? { key: options.key } : {}) });
	};
	return { emit, events };
}

describe('EasycodeApprovalBridge', () => {
	function setup(options: { timeoutMs?: number; grants?: Set<string> } = {}) {
		const { emit, events } = collector();
		const decided: Array<{ approvalId: string; decision: string }> = [];
		const granted: string[] = [];
		const bridge = new EasycodeApprovalBridge({
			threadId: 'thread-1',
			emit,
			grants: {
				load: async () => options.grants ?? new Set<string>(),
				grant: async (key) => {
					granted.push(key);
				},
			},
			decide: (approvalId, decision) => {
				decided.push({ approvalId, decision });
				return true;
			},
			...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
		});
		return { bridge, events, decided, granted };
	}

	const request = {
		approvalId: 'req-1:item-1',
		kind: 'commandExecution' as const,
		threadId: 'thread-1',
		turnId: 'turn-1',
		itemId: 'item-1',
		command: 'npm test',
		reason: 'run tests',
	};

	it('emits one card and answers the same connection once', async () => {
		const { bridge, events, decided } = setup();
		await bridge.loadGrants();

		bridge.request(request);
		bridge.request(request); // dedupe
		bridge.resolve(request.approvalId, 'accept');

		expect(events.filter((event) => event.name === 'easycode-approval-requested')).toHaveLength(1);
		expect(decided).toEqual([{ approvalId: request.approvalId, decision: 'accept' }]);
		expect(bridge.audit).toHaveLength(1);
		expect(bridge.audit[0]?.timedOut).toBe(false);
	});

	it('declines and audits a request that nobody answers', async () => {
		const { bridge, events, decided } = setup({ timeoutMs: 5 });
		await bridge.loadGrants();

		bridge.request(request);
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(decided).toEqual([{ approvalId: request.approvalId, decision: 'decline' }]);
		expect(bridge.audit[0]?.timedOut).toBe(true);
		expect(events.map((event) => event.name)).toContain('easycode-approval-decided');
	});

	it('answers a granted session target without a card', async () => {
		const { bridge, events, decided } = setup({
			grants: new Set(['easycode:commandExecution:npm test']),
		});
		await bridge.loadGrants();

		bridge.request(request);

		expect(events.filter((event) => event.name === 'easycode-approval-requested')).toHaveLength(0);
		expect(decided).toEqual([{ approvalId: request.approvalId, decision: 'accept' }]);
	});

	it('saves a session grant of an acceptForSession decision', async () => {
		const { bridge, granted } = setup();
		await bridge.loadGrants();

		bridge.request(request);
		bridge.resolve(request.approvalId, 'acceptForSession');
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(granted).toEqual(['easycode:commandExecution:npm test']);
	});

	it('resolves every approval of an interrupted turn', async () => {
		const { bridge, decided } = setup();
		await bridge.loadGrants();
		bridge.request(request);

		const count = bridge.cancelTurn('turn-1');

		expect(count).toBe(1);
		expect(decided).toEqual([{ approvalId: request.approvalId, decision: 'cancel' }]);
	});
});

describe('EasycodeEventProjector', () => {
	it('projects deltas and dedupes the item lifecycle events', () => {
		const { emit, events } = collector();
		const projector = new EasycodeEventProjector({ threadId: 'thread-1', emitHostEvent: emit });

		const first = projector.project({
			method: 'item/agentMessage/delta',
			params: { itemId: 'item-1', delta: 'Hello ' },
		});
		const second = projector.project({
			method: 'item/agentMessage/delta',
			params: { itemId: 'item-1', delta: 'world' },
		});
		projector.project({
			method: 'item/completed',
			params: { item: { id: 'item-1', type: 'agentMessage' } },
		});
		projector.project({
			method: 'item/completed',
			params: { item: { id: 'item-1', type: 'agentMessage' } },
		});

		expect(first).toEqual([
			{ type: 'text-start', id: 'item-1' },
			{ type: 'text-delta', id: 'item-1', delta: 'Hello ' },
		]);
		expect(second).toEqual([{ type: 'text-delta', id: 'item-1', delta: 'world' }]);
		expect(events.filter((event) => event.name === 'easycode-item-completed')).toHaveLength(1);
	});

	it('maps usage and errors', () => {
		const projector = new EasycodeEventProjector({ threadId: 'thread-1' });

		const usage = projector.project({
			method: 'thread/tokenUsage/updated',
			params: { usage: { inputTokens: 10, outputTokens: 5 } },
		});
		const error = projector.project({
			method: 'error',
			params: { error: { message: 'model overloaded' } },
		});

		expect(usage).toEqual([
			{
				type: 'usage',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
				model: 'easycode',
			},
		]);
		expect(error[0]).toMatchObject({ type: 'error' });
	});
});

describe('EasycodeArtifactBridge', () => {
	const patch = [
		'diff --git a/src/app.ts b/src/app.ts',
		'index 111..222 100644',
		'--- a/src/app.ts',
		'+++ b/src/app.ts',
		'@@ -1 +1 @@',
		'-old',
		'+new',
		'diff --git a/src/new.ts b/src/new.ts',
		'new file mode 100644',
		'--- /dev/null',
		'+++ b/src/new.ts',
		'@@ -0,0 +1 @@',
		'+fresh',
	].join('\n');

	it('joins the deltas and emits a manifest with the patch hash', async () => {
		const { emit, events } = collector();
		const bridge = new EasycodeArtifactBridge({ threadId: 'thread-1', emit });

		bridge.observe({
			method: 'item/fileChange/outputDelta',
			params: { itemId: 'patch-1', delta: patch },
		});
		bridge.observe({
			method: 'item/completed',
			params: { item: { id: 'patch-1', type: 'fileChange' } },
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		const artifact = events.find((event) => event.name === 'easycode-artifact');
		expect(artifact?.payload).toMatchObject({
			itemId: 'patch-1',
			sha256: createHash('sha256').update(patch).digest('hex'),
			bytes: Buffer.byteLength(patch),
			parents: ['thread-1'],
		});
		expect(parsePatchFiles(patch)).toEqual([
			{ path: 'src/app.ts', status: 'modified' },
			{ path: 'src/new.ts', status: 'added' },
		]);
	});

	it('emits nothing when the item has no patch', async () => {
		const { emit, events } = collector();
		const bridge = new EasycodeArtifactBridge({ threadId: 'thread-1', emit });

		bridge.observe({
			method: 'item/completed',
			params: { item: { id: 'patch-2', type: 'fileChange' } },
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(events).toHaveLength(0);
	});
});

describe('EasycodeDynamicToolset', () => {
	const tools = [
		{
			name: 'pong_write',
			description: 'write',
			inputSchema: { type: 'object' },
			requiresApproval: true,
			handler: async () => 'written',
		},
		{
			name: 'pong_read',
			description: 'read',
			inputSchema: { type: 'object' },
			handler: async () => 'read',
		},
	];

	it('hashes the specs stably and ignores the key order', () => {
		const first = new EasycodeDynamicToolset({ threadId: 'thread-1', tools });
		const second = new EasycodeDynamicToolset({
			threadId: 'thread-1',
			tools: [...tools].reverse(),
		});
		// The tool order is part of the prompt, so the hashes differ by order.
		expect(first.hash()).not.toBe(second.hash());
		expect(new EasycodeDynamicToolset({ threadId: 'thread-1', tools }).hash()).toBe(first.hash());
	});

	it('asks the approval bridge before a side-effecting tool', async () => {
		const asked: string[] = [];
		const set = new EasycodeDynamicToolset({
			threadId: 'thread-1',
			tools,
			approver: {
				ask: async (request) => {
					asked.push(request.approvalId);
					return 'accept';
				},
			},
		});

		const result = await set.handle({
			threadId: 'thread-1',
			turnId: 'turn-1',
			callId: 'call-1',
			tool: 'pong_write',
			arguments: {},
		});

		expect(asked).toEqual(['dynamic-tool:call-1']);
		expect(result).toEqual({ success: true, text: 'written' });
	});

	it('does not run a declined tool', async () => {
		const set = new EasycodeDynamicToolset({
			threadId: 'thread-1',
			tools,
			approver: { ask: async () => 'decline' },
		});

		const result = await set.handle({
			threadId: 'thread-1',
			turnId: 'turn-1',
			callId: 'call-2',
			tool: 'pong_write',
			arguments: {},
		});

		expect(result.success).toBe(false);
		expect(result.text).toContain('declined');
	});

	it('runs a read-only tool without a card', async () => {
		const set = new EasycodeDynamicToolset({
			threadId: 'thread-1',
			tools,
			approver: { ask: async () => 'decline' },
		});

		const result = await set.handle({
			threadId: 'thread-1',
			turnId: 'turn-1',
			callId: 'call-3',
			tool: 'pong_read',
			arguments: {},
		});

		expect(result).toEqual({ success: true, text: 'read' });
	});
});

describe('thread state', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'easycode-state-'));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('round-trips the state and plans a resume only when cwd and toolset match', async () => {
		const store = EasycodeThreadStateStore.forHome(dir);
		const state: EasycodeThreadState = {
			easycodeThreadId: 'ec-1',
			cwd: 'C:/work',
			toolsetHash: 'hash-1',
			gitHead: null,
			gitDirty: null,
			updatedAt: new Date().toISOString(),
		};
		await store.write('thread-1', state);

		const read = await store.read('thread-1');
		expect(read).toEqual(state);
		expect(planResume(read, { cwd: 'C:/work', toolsetHash: 'hash-1' })).toEqual({
			action: 'resume',
		});
		expect(planResume(read, { cwd: 'C:/other', toolsetHash: 'hash-1' })).toEqual({
			action: 'fork',
			reason: 'cwd-changed',
		});
		expect(planResume(read, { cwd: 'C:/work', toolsetHash: 'hash-2' })).toEqual({
			action: 'fork',
			reason: 'toolset-changed',
		});
		expect(planResume(null, { cwd: 'C:/work', toolsetHash: 'hash-1' })).toEqual({
			action: 'fork',
			reason: 'no-thread-state',
		});
	});
});

describe('easyCode approval contract', () => {
	const request = {
		approvalId: 'req-9:item-9',
		kind: 'commandExecution' as const,
		threadId: 'thread-1',
		turnId: 'turn-1',
		itemId: 'item-9',
		command: 'node -e "console.log(1)"',
		reason: 'run the command',
	};

	it('emits the frozen request payload and resolves ok, then decided', async () => {
		const { emit, events } = collector();
		const decided: string[] = [];
		const bridge = new EasycodeApprovalBridge({
			threadId: 'thread-1',
			emit,
			grants: { load: async () => new Set(), grant: async () => undefined },
			decide: (_approvalId, decision) => {
				decided.push(decision);
				return true;
			},
		});
		await bridge.loadGrants();

		bridge.request(request);

		const payload = events[0]?.payload as Record<string, unknown>;
		expect(events[0]?.name).toBe('easycode-approval-requested');
		expect(payload).toMatchObject({
			approvalId: request.approvalId,
			threadId: 'thread-1',
			turnId: 'turn-1',
			itemId: 'item-9',
			requestKind: 'command',
			command: request.command,
			availableDecisions: ['accept', 'decline', 'acceptForSession'],
		});
		expect(typeof payload.expiresAtMs).toBe('number');

		expect(bridge.resolve(request.approvalId, 'accept')).toEqual({ status: 'ok' });
		expect(bridge.resolve(request.approvalId, 'accept')).toEqual({ status: 'decided' });
		expect(decided).toEqual(['accept']);
	});

	it('returns the expired state after the deadline', async () => {
		const { emit } = collector();
		const bridge = new EasycodeApprovalBridge({
			threadId: 'thread-1',
			emit,
			grants: { load: async () => new Set(), grant: async () => undefined },
			decide: () => true,
			timeoutMs: 1,
		});
		await bridge.loadGrants();
		bridge.request(request);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(bridge.resolve(request.approvalId, 'accept')).toEqual({ status: 'expired' });
	});

	it('sends the collected answers of an input request', async () => {
		const { emit } = collector();
		const answersSent: Array<Record<string, { answers: string[] }>> = [];
		const decisions: string[] = [];
		const bridge = new EasycodeApprovalBridge({
			threadId: 'thread-1',
			emit,
			grants: { load: async () => new Set(), grant: async () => undefined },
			decide: (_approvalId, decision) => {
				decisions.push(decision);
				return true;
			},
			answerUserInput: (_approvalId, answers) => {
				answersSent.push(answers);
				return true;
			},
		});
		await bridge.loadGrants();
		bridge.request({
			approvalId: 'req-input:item-input',
			kind: 'userInput',
			threadId: 'thread-1',
			turnId: 'turn-1',
			itemId: 'item-input',
			command: null,
			reason: null,
			questions: [
				{
					id: 'q1',
					header: 'Pick one',
					question: 'Which environment?',
					options: [{ label: 'staging' }, { label: 'production' }],
				},
			],
		});

		const outcome = bridge.resolve('req-input:item-input', 'accept', {
			q1: ['staging'],
		});

		expect(outcome).toEqual({ status: 'ok' });
		expect(answersSent).toEqual([{ q1: { answers: ['staging'] } }]);
		expect(decisions).toEqual([]);
	});
});

describe('EasycodeAttachmentArtifactSink', () => {
	it('stores the patch through the attachment service with the content hash', async () => {
		const attachments = mock<AgentChatAttachmentService>();
		attachments.storeInbound.mockResolvedValue({ id: 'attachment-1' } as never);
		const sink = new EasycodeAttachmentArtifactSink(attachments, {
			agentId: 'easycode',
			projectId: 'project-1',
			threadId: 'thread-1',
			resourceId: 'system-chat:thread-1',
		});
		const bytes = Buffer.from('diff --git a/a b/a\n');

		const stored = await sink.store({
			bytes,
			fileName: 'patch.patch',
			mimeType: 'text/x-diff',
		});

		expect(stored).toEqual({ fileId: 'attachment-1' });
		expect(attachments.storeInbound).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId: 'easycode',
				projectId: 'project-1',
				threadId: 'thread-1',
				resourceId: 'system-chat:thread-1',
				source: 'tool',
				fileName: 'patch.patch',
				contentHash: createHash('sha256').update(bytes).digest('hex'),
			}),
		);
	});
});
