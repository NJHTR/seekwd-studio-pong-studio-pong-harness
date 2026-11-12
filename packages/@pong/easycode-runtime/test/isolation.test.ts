import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppServerSupervisor, SupervisorInitError } from '../src/index';
import type { SupervisorOptions } from '../src/index';

const FAKE_SERVER = path.join(__dirname, 'fixtures', 'fake-app-server.mjs');
const activeSupervisors: AppServerSupervisor[] = [];
const tempDirs: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

async function makeBaseHome(): Promise<string> {
	const baseHome = await makeTempDir('pong-iso-base-');
	await writeFile(path.join(baseHome, 'config.toml'), 'model = "fake"\n', 'utf8');
	return baseHome;
}

function createIsolationSupervisor(
	options: Partial<SupervisorOptions> & { mode: string },
): AppServerSupervisor {
	const { mode, ...overrides } = options;
	const supervisor = new AppServerSupervisor({
		exePath: process.execPath,
		appServerArgs: [FAKE_SERVER],
		env: { ...process.env, FAKE_APP_SERVER_MODE: mode, FAKE_ECHO_HOME: '1' },
		homeMode: 'per-run',
		requestTimeoutMs: 3_000,
		shutdownGraceMs: 500,
		shutdownInterruptTimeoutMs: 500,
		maxInitRestarts: 2,
		initRetryBaseMs: 5,
		initRetryMaxDelayMs: 10,
		...overrides,
	});
	activeSupervisors.push(supervisor);
	return supervisor;
}

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (predicate()) return true;
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 25);
		});
	}
	return predicate();
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
		await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(
			() => undefined,
		);
	}
});

describe('per-run home isolation', () => {
	it('gives concurrent runs distinct homes and removes both after shutdown', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-iso-runs-');
		const first = createIsolationSupervisor({ mode: 'normal', easycodeHome: baseHome, runsRoot });
		const second = createIsolationSupervisor({ mode: 'normal', easycodeHome: baseHome, runsRoot });
		await Promise.all([first.start(), second.start()]);

		const firstHome = first.initializeResult?.easycodeHome;
		const secondHome = second.initializeResult?.easycodeHome;
		expect(firstHome).toBeDefined();
		expect(secondHome).toBeDefined();
		expect(firstHome).not.toBe(secondHome);
		if (firstHome === undefined || secondHome === undefined) throw new Error('missing home');
		expect(path.dirname(firstHome)).toBe(runsRoot);
		expect(path.dirname(secondHome)).toBe(runsRoot);
		expect(firstHome).toBe(first.runHomePath);
		expect(secondHome).toBe(second.runHomePath);
		expect(existsSync(firstHome)).toBe(true);
		expect(existsSync(secondHome)).toBe(true);

		await Promise.all([first.shutdown(), second.shutdown()]);
		expect(existsSync(firstHome)).toBe(false);
		expect(existsSync(secondHome)).toBe(false);
		expect(first.runHomePath).toBeNull();
		expect(second.runHomePath).toBeNull();
	});

	it('uses per-run as the default home mode', async () => {
		const previous = process.env.PONG_EASYCODE_HOME_MODE;
		delete process.env.PONG_EASYCODE_HOME_MODE;
		try {
			const supervisor = createIsolationSupervisor({
				mode: 'normal',
				homeMode: undefined,
				easycodeHome: await makeBaseHome(),
				runsRoot: await makeTempDir('pong-iso-default-'),
			});
			expect(supervisor.homeMode).toBe('per-run');
			await supervisor.start();
			expect(supervisor.runHomePath).not.toBeNull();
		} finally {
			if (previous === undefined) delete process.env.PONG_EASYCODE_HOME_MODE;
			else process.env.PONG_EASYCODE_HOME_MODE = previous;
		}
	});

	it('removes the run home after a crash', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-iso-crash-runs-');
		let resolveExit: (() => void) | null = null;
		const exited = new Promise<void>((resolve) => {
			resolveExit = resolve;
		});
		const supervisor = createIsolationSupervisor({
			mode: 'crash-after-ready',
			easycodeHome: baseHome,
			runsRoot,
			events: {
				onExit: () => {
					resolveExit?.();
				},
			},
		});
		await supervisor.start();
		const home = supervisor.runHomePath;
		if (home === null) throw new Error('per-run home was not created');
		expect(existsSync(home)).toBe(true);
		await exited;
		expect(await waitFor(() => !existsSync(home), 3_000)).toBe(true);
		expect(supervisor.state).toBe('closed');
	});

	it('removes the run home when initialization fails permanently', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-iso-fail-runs-');
		const counterFile = path.join(await makeTempDir('pong-iso-fail-counter-'), 'counter.txt');
		const supervisor = createIsolationSupervisor({
			mode: 'sqlite-init-fail',
			easycodeHome: baseHome,
			runsRoot,
			env: {
				...process.env,
				FAKE_APP_SERVER_MODE: 'sqlite-init-fail',
				FAKE_COUNTER_FILE: counterFile,
				FAKE_SQLITE_FAIL_ATTEMPTS: '99',
			},
			maxInitRestarts: 2,
		});
		const error = await supervisor.start().catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(SupervisorInitError);
		expect(supervisor.runHomePath).toBeNull();
		const entries = await readdir(runsRoot);
		expect(entries.filter((name) => name.startsWith('run-'))).toEqual([]);
	});

	it('regression: a later run cannot recover the previous run rollout JSONL', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-iso-leak-runs-');
		const producer = createIsolationSupervisor({
			mode: 'write-rollout',
			easycodeHome: baseHome,
			runsRoot,
		});
		await producer.start();
		const producerHome = producer.runHomePath;
		if (producerHome === null) throw new Error('per-run home was not created');
		const rolloutFile = path.join(producerHome, 'sessions', 'rollout-leak-probe.jsonl');
		expect(await waitFor(() => existsSync(rolloutFile), 3_000)).toBe(true);
		await producer.shutdown();

		// This is the M1 A/B leak path: the consumer looked up a sibling home
		// path and read its rollout JSONL. After the run ends the path is gone.
		expect(existsSync(producerHome)).toBe(false);
		expect(existsSync(rolloutFile)).toBe(false);
		const entries = await readdir(runsRoot);
		expect(entries.filter((name) => name.startsWith('run-'))).toEqual([]);
	});
});
