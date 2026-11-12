import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import {
	AppServerSupervisor,
	isRecord,
	isTurnCompletedNotification,
	SupervisorInitError,
} from '../src/index';
import type { SupervisorOptions } from '../src/index';

const FAKE_SERVER = path.join(__dirname, 'fixtures', 'fake-app-server.mjs');
const TEST_HOME_BASE = path.join(tmpdir(), `pong-easycode-runtime-test-home-${process.pid}`);
const activeSupervisors: AppServerSupervisor[] = [];
const tempDirs: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

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
		homeMode: 'shared',
		easycodeHome: TEST_HOME_BASE,
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
	for (const dir of tempDirs.splice(0)) {
		await rm(dir, { recursive: true, force: true });
	}
});

afterAll(async () => {
	await rm(TEST_HOME_BASE, { recursive: true, force: true });
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

describe('AppServerSupervisor init recovery', () => {
	it('restarts after a retryable sqlite init failure and reports attempts', async () => {
		const counterFile = path.join(await makeTempDir('pong-retry-counter-'), 'counter.txt');
		const home = path.join(await makeTempDir('pong-retry-home-'), 'home');
		const { supervisor } = createSupervisor('sqlite-init-fail', {
			env: {
				...process.env,
				FAKE_APP_SERVER_MODE: 'sqlite-init-fail',
				FAKE_COUNTER_FILE: counterFile,
				FAKE_SQLITE_FAIL_ATTEMPTS: '2',
			},
			homeMode: 'shared',
			easycodeHome: home,
			maxInitRestarts: 5,
			initRetryBaseMs: 10,
			initRetryMaxDelayMs: 50,
		});
		const initialize = await supervisor.start();
		expect(initialize.userAgent).toBe('fake-app-server/0.0.0');
		expect(supervisor.initAttempts).toBe(3);
		expect(supervisor.initFailures).toBe(2);
		expect(supervisor.state).toBe('ready');
		expect(supervisor.healthCheck().initFailures).toBe(2);
	});

	it('throws SupervisorInitError after the retry limit', async () => {
		const counterFile = path.join(await makeTempDir('pong-fatal-counter-'), 'counter.txt');
		const { supervisor } = createSupervisor('sqlite-init-fail', {
			env: {
				...process.env,
				FAKE_APP_SERVER_MODE: 'sqlite-init-fail',
				FAKE_COUNTER_FILE: counterFile,
				FAKE_SQLITE_FAIL_ATTEMPTS: '99',
			},
			homeMode: 'per-agent',
			easycodeHome: await makeTempDir('pong-fatal-home-'),
			agentId: 'agent-fatal',
			maxInitRestarts: 3,
			initRetryBaseMs: 5,
			initRetryMaxDelayMs: 10,
		});
		const rejection = supervisor.start().catch((error: unknown) => error);
		const error = await rejection;
		expect(error).toBeInstanceOf(SupervisorInitError);
		if (error instanceof SupervisorInitError) {
			expect(error.attempts).toBe(4);
			expect(error.retries).toBe(3);
			expect(error.stderrTail).toContain('failed to initialize sqlite state runtime');
		}
		expect(supervisor.state).toBe('closed');
		expect(supervisor.initFailures).toBe(4);
	});

	it('does not retry a non-retryable init failure', async () => {
		const { supervisor } = createSupervisor('exit-immediately', {
			homeMode: 'per-agent',
			easycodeHome: await makeTempDir('pong-noretry-home-'),
			agentId: 'agent-noretry',
			maxInitRestarts: 5,
			initRetryBaseMs: 5,
			initRetryMaxDelayMs: 10,
		});
		const error = await supervisor.start().catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(SupervisorInitError);
		expect(supervisor.initAttempts).toBe(1);
	});

	it('uses a per-agent EASYCODE_HOME and seeds config files', async () => {
		const baseHome = await makeTempDir('pong-peragent-base-');
		await writeFile(path.join(baseHome, 'config.toml'), 'model = "fake"\n', 'utf8');
		const { supervisor } = createSupervisor('normal', {
			env: { ...process.env, FAKE_APP_SERVER_MODE: 'normal', FAKE_ECHO_HOME: '1' },
			homeMode: 'per-agent',
			easycodeHome: baseHome,
			agentId: 'agent-a',
		});
		const initialize = await supervisor.start();
		const childHome = path.join(baseHome, 'agents', 'agent-a');
		expect(initialize.easycodeHome).toBe(childHome);
		expect(supervisor.homeMode).toBe('per-agent');
		expect(supervisor.easycodeHome).toBe(childHome);
		expect(existsSync(path.join(childHome, 'config.toml'))).toBe(true);
	});

	it('serializes first starts that share an easyCode home', async () => {
		const baseHome = await makeTempDir('pong-shared-home-');
		const markerFile = path.join(await makeTempDir('pong-shared-marker-'), 'handshake.txt');
		const make = (serverId: string): AppServerSupervisor => {
			const { supervisor } = createSupervisor('slow-handshake', {
				env: {
					...process.env,
					FAKE_APP_SERVER_MODE: 'slow-handshake',
					FAKE_HOME_MARKER_FILE: markerFile,
					FAKE_SERVER_ID: serverId,
					FAKE_SLOW_HANDSHAKE_MS: '120',
				},
				homeMode: 'shared',
				easycodeHome: baseHome,
			});
			return supervisor;
		};
		const first = make('a');
		const second = make('b');
		await Promise.all([first.start(), second.start()]);
		const lines = (await readFile(markerFile, 'utf8')).trim().split('\n');
		expect(lines).toHaveLength(4);
		const events = lines.map((line) => {
			const [phase, serverId] = line.split(' ');
			return { phase, serverId };
		});
		const firstStart = events[0];
		const firstEnd = events[1];
		const secondStart = events[2];
		const secondEnd = events[3];
		expect(firstStart.phase).toBe('start');
		expect(firstEnd).toEqual({ phase: 'end', serverId: firstStart.serverId });
		expect(secondStart.phase).toBe('start');
		expect(secondEnd).toEqual({ phase: 'end', serverId: secondStart.serverId });
		expect(firstStart.serverId).not.toBe(secondStart.serverId);
	});

	it('reads the home mode from PONG_EASYCODE_HOME_MODE', async () => {
		const previous = process.env.PONG_EASYCODE_HOME_MODE;
		try {
			process.env.PONG_EASYCODE_HOME_MODE = 'per-agent';
			const { supervisor } = createSupervisor('normal', {
				homeMode: undefined,
				easycodeHome: await makeTempDir('pong-env-home-'),
				agentId: 'agent-env',
			});
			expect(supervisor.homeMode).toBe('per-agent');
			process.env.PONG_EASYCODE_HOME_MODE = 'nonsense';
			expect(
				() =>
					new AppServerSupervisor({
						exePath: process.execPath,
						appServerArgs: [FAKE_SERVER],
						homeMode: undefined,
						easycodeHome: TEST_HOME_BASE,
					}),
			).toThrow();
		} finally {
			if (previous === undefined) delete process.env.PONG_EASYCODE_HOME_MODE;
			else process.env.PONG_EASYCODE_HOME_MODE = previous;
		}
	});
});
