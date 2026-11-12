import type { AuthenticatedRequest, User } from '@pong/db';
import { ConflictError, NotFoundError } from '@pong/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import type { AgentChatRelayService } from '../../agent-chat-relay.service';
import type { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import type { AgentMessageQueueService } from '../../agent-message-queue.service';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { PONGCheckpointStorage } from '../../integrations/pong-checkpoint-storage';
import type { PongMemory } from '../../integrations/pong-memory';
import { EasycodeApprovalBridge } from '../easycode/approval-bridge';
import { EasycodeApprovalRegistry } from '../easycode/easycode-approval-registry';
import { SystemAgentChatController } from '../system-agent-chat.controller';
import type { SystemAgentExecutionService } from '../system-agent-execution.service';

const AGENT_ID = 'easycode';
const THREAD_ID = 'thread-1';
const user = mock<User>({ id: 'user-1' });

function setup() {
	const systemAgents = mock<SystemAgentExecutionService>();
	systemAgents.getUsableThread.mockResolvedValue({
		id: THREAD_ID,
		projectId: 'project-1',
	} as AgentExecutionThread);
	const registry = new EasycodeApprovalRegistry();
	const decided: Array<{ approvalId: string; decision: string }> = [];
	const bridge = new EasycodeApprovalBridge({
		threadId: THREAD_ID,
		emit: () => undefined,
		grants: { load: async () => new Set(), grant: async () => undefined },
		decide: (approvalId, decision) => {
			decided.push({ approvalId, decision });
			return true;
		},
		timeoutMs: 60_000,
	});
	registry.register(THREAD_ID, bridge);
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
	const request = {
		user,
	} as unknown as AuthenticatedRequest;
	return { controller, registry, bridge, decided, request, systemAgents };
}

const approvalRequest = {
	approvalId: 'req-1:item-1',
	kind: 'commandExecution' as const,
	threadId: THREAD_ID,
	turnId: 'turn-1',
	itemId: 'item-1',
	command: 'npm test',
	reason: 'run tests',
};

describe('easyCode approval decision endpoint', () => {
	it('accepts a decision and answers the connection once', async () => {
		const { controller, bridge, decided, request } = setup();
		await bridge.loadGrants();
		bridge.request(approvalRequest);

		const result = await controller.decideApproval(
			request,
			AGENT_ID,
			THREAD_ID,
			approvalRequest.approvalId,
			{ decision: 'accept' },
		);

		expect(result).toEqual({ ok: true });
		expect(decided).toEqual([{ approvalId: approvalRequest.approvalId, decision: 'accept' }]);
	});

	it('returns the expired state for a timed-out approval', async () => {
		const { controller, bridge, request } = setup();
		await bridge.loadGrants();
		bridge.request(approvalRequest);
		// Force the timeout path directly: a second request is idempotent, and the
		// endpoint answers 409 with the expired state after the timeout settled.
		bridge.cancelTurn('turn-1');
		const timedOut = new EasycodeApprovalBridge({
			threadId: 'thread-timeout',
			emit: () => undefined,
			grants: { load: async () => new Set(), grant: async () => undefined },
			decide: () => true,
			timeoutMs: 1,
		});
		await timedOut.loadGrants();
		timedOut.request(approvalRequest);
		await new Promise((resolve) => setTimeout(resolve, 10));
		const outcome = timedOut.resolve(approvalRequest.approvalId, 'accept');
		expect(outcome).toEqual({ status: 'expired' });
		// The controller still maps the canceled approval of its own bridge.
		await expect(
			controller.decideApproval(request, AGENT_ID, THREAD_ID, approvalRequest.approvalId, {
				decision: 'accept',
			}),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it('returns 404 for an unknown approval', async () => {
		const { controller, request } = setup();

		await expect(
			controller.decideApproval(request, AGENT_ID, THREAD_ID, 'missing', { decision: 'accept' }),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it('returns 409 when a second decision arrives', async () => {
		const { controller, bridge, request } = setup();
		await bridge.loadGrants();
		bridge.request(approvalRequest);
		await controller.decideApproval(request, AGENT_ID, THREAD_ID, approvalRequest.approvalId, {
			decision: 'accept',
		});

		await expect(
			controller.decideApproval(request, AGENT_ID, THREAD_ID, approvalRequest.approvalId, {
				decision: 'decline',
			}),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it('rejects an invalid decision body and a foreign thread', async () => {
		const { controller, request, systemAgents } = setup();

		await expect(
			controller.decideApproval(request, AGENT_ID, THREAD_ID, 'missing', { decision: 'maybe' }),
		).rejects.toThrow('The decision must be');

		systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));
		await expect(
			controller.decideApproval(request, AGENT_ID, 'other-thread', 'missing', {
				decision: 'accept',
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});
