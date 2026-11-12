import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppServerSupervisor, isRecord, isTurnCompletedNotification } from '../src/index';
import type { SupervisorOptions } from '../src/index';

const FAKE_SERVER = path.join(__dirname, 'fixtures', 'fake-app-server.mjs');
const activeSupervisors: AppServerSupervisor[] = [];

function createSupervisor(
	mode: string,
	overrides: Partial<SupervisorOptions> = {},
): { supervisor: AppServerSupervisor; notifications: string[] } {
	const notifications: string[] = [];
	const supervisor = new AppServerSupervisor({
		exePath: process.execPath,
		appServerArgs: [FAKE_SERVER],
		env: { ...process.env, FAKE_APP_SERVER_MODE: mode },
		requestTimeoutMs: 3_000,
		approvalTimeoutMs: 3_000,
		shutdownGraceMs: 500,
		shutdownInterruptTimeoutMs: 500,
		events: {
			onNotification: (notification) => {
				notifications.push(notification.method);
			},
			onApprovalRequest: () => 'accept',
			onDynamicToolCall: (call) => {
				const text =
					isRecord(call.arguments) && typeof call.arguments.text === 'string'
						? call.arguments.text
						: 'none';
				return { contentItems: [{ type: 'inputText', text: `pong_echo: ${text}` }], success: true };
			},
			...overrides.events,
		},
		...overrides,
	});
	activeSupervisors.push(supervisor);
	return { supervisor, notifications };
}

afterEach(async () => {
	for (const supervisor of activeSupervisors.splice(0)) {
		try {
			await supervisor.shutdown();
		} catch {
			// The test already closed the supervisor or the child is gone.
		}
	}
});

describe('AppServerSupervisor', () => {
	it('performs the handshake and reports health', async () => {
		const { supervisor } = createSupervisor('normal');
		const initialize = await supervisor.start();
		expect(initialize.userAgent).toBe('fake-app-server/0.0.0');
		expect(initialize.platformOs).toBe('windows');
		expect(supervisor.state).toBe('ready');
		const health = supervisor.healthCheck();
		expect(health.ok).toBe(true);
		expect(health.pid).not.toBeNull();
		expect(health.pendingApprovals).toBe(0);
	});

	it('runs a full turn with an approval and a dynamic tool call', async () => {
		const { supervisor, notifications } = createSupervisor('normal');
		await supervisor.start();
		const thread = await supervisor.startThread({ cwd: 'C:/fake-cwd' });
		expect(thread.thread.id).toBe('thread-1');
		const started = await supervisor.startTurn(thread.thread.id, 'do a thing');
		expect(started.turn.status).toBe('inProgress');
		const completed = await supervisor.waitForTurnCompleted(started.turn.id, 3_000);
		expect(isTurnCompletedNotification(completed.params)).toBe(true);
		if (isTurnCompletedNotification(completed.params)) {
			expect(completed.params.turn.status).toBe('completed');
		}
		expect(notifications).toContain('turn/started');
		expect(notifications).toContain('item/completed');
		expect(notifications).toContain('turn/completed');
		const decisions = supervisor.approvals.records.map((record) => record.decision);
		expect(decisions).toEqual(['accept']);
		expect(supervisor.approvals.stats.accepted).toBe(1);
		expect(supervisor.currentTurnId).toBeNull();
	});

	it('resumes a thread after a completed turn', async () => {
		const { supervisor } = createSupervisor('normal');
		await supervisor.start();
		const thread = await supervisor.startThread({ cwd: 'C:/fake-cwd' });
		const started = await supervisor.startTurn(thread.thread.id, 'warmup');
		await supervisor.waitForTurnCompleted(started.turn.id, 3_000);
		const resumed = await supervisor.resumeThread({
			threadId: thread.thread.id,
			excludeTurns: true,
		});
		expect(resumed.thread.id).toBe('thread-1');
		expect(resumed.model).toBe('fake-model');
	});

	it('interrupts an active turn and maps no-active-turn to ended', async () => {
		const { supervisor } = createSupervisor('slow-turn');
		await supervisor.start();
		const thread = await supervisor.startThread({ cwd: 'C:/fake-cwd' });
		const started = await supervisor.startTurn(thread.thread.id, 'long task');
		const first = await supervisor.interruptTurn(thread.thread.id, started.turn.id, 1_000);
		expect(first.status).toBe('interrupted');
		const completed = await supervisor.waitForTurnCompleted(started.turn.id, 1_000);
		if (isTurnCompletedNotification(completed.params)) {
			expect(completed.params.turn.status).toBe('interrupted');
		}
		const second = await supervisor.interruptTurn(thread.thread.id, started.turn.id, 500);
		expect(second.status).toBe('no-active-turn');
	});

	it('treats a missing interrupt response as ended', async () => {
		const { supervisor } = createSupervisor('repeat-interrupt-silent');
		await supervisor.start();
		const thread = await supervisor.startThread({ cwd: 'C:/fake-cwd' });
		const started = await supervisor.startTurn(thread.thread.id, 'quick task');
		await supervisor.waitForTurnCompleted(started.turn.id, 3_000);
		const outcome = await supervisor.interruptTurn(thread.thread.id, started.turn.id, 150);
		expect(outcome.status).toBe('no-response');
		expect(outcome.detail).toContain('timed out');
	});

	it('kills the process tree when stdin close does not stop the child', async () => {
		const { supervisor } = createSupervisor('ignore-stdin-close', { shutdownGraceMs: 300 });
		await supervisor.start();
		const result = await supervisor.shutdown();
		expect(result.steps).toContain('stdin-closed');
		expect(result.steps).toContain('kill-tree');
		expect(result.forcedKill).toBe(true);
		expect(supervisor.state).toBe('closed');
	});

	it('declines pending approvals on shutdown', async () => {
		const { supervisor } = createSupervisor('slow-turn', {
			events: {
				onApprovalRequest: () => undefined,
			},
		});
		await supervisor.start();
		const thread = await supervisor.startThread({ cwd: 'C:/fake-cwd' });
		await supervisor.startTurn(thread.thread.id, 'task needing approval');
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 100);
		});
		expect(supervisor.approvals.pendingCount).toBe(1);
		const result = await supervisor.shutdown();
		expect(result.steps).toContain('interrupt:interrupted');
		expect(supervisor.approvals.pendingCount).toBe(0);
	});
});
