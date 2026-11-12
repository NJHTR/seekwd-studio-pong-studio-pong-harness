#!/usr/bin/env node
// Isolation smoke: per-run easyCode home lifecycle, no real binary or model.
//
// Usage:
//   pnpm --filter @pong/easycode-runtime build
//   node scripts/poc/isolation-smoke.mjs --smoke
//
// It uses the built runtime package and the fake app-server fixture. Each check
// prints PASS/FAIL; the process exits 1 when any check fails.

import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const RUNTIME_DIST = path.join(
	REPO_ROOT,
	'packages',
	'@pong',
	'easycode-runtime',
	'dist',
	'index.js',
);
const FAKE_SERVER = path.join(
	REPO_ROOT,
	'packages',
	'@pong',
	'easycode-runtime',
	'test',
	'fixtures',
	'fake-app-server.mjs',
);

const results = [];
const created = [];
let runtime;

function record(name, ok, detail) {
	results.push({ name, ok, detail });
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ` (${detail})`}`);
}

function assert(name, condition, detail) {
	if (!condition) throw new Error(`${name}${detail === undefined ? '' : `: ${detail}`}`);
}

async function makeTempDir(prefix) {
	const dir = await mkdtemp(path.join(tmpdir(), prefix));
	created.push(dir);
	return dir;
}

async function waitFor(predicate, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (predicate()) return true;
		await new Promise((resolve) => {
			setTimeout(resolve, 25);
		});
	}
	return predicate();
}

function createSupervisor(options) {
	return new runtime.AppServerSupervisor({
		exePath: process.execPath,
		appServerArgs: [FAKE_SERVER],
		env: {
			...process.env,
			FAKE_APP_SERVER_MODE: options.mode,
			FAKE_ECHO_HOME: '1',
			...(options.env ?? {}),
		},
		homeMode: 'per-run',
		requestTimeoutMs: 3_000,
		shutdownGraceMs: 500,
		shutdownInterruptTimeoutMs: 500,
		maxInitRestarts: 2,
		initRetryBaseMs: 5,
		initRetryMaxDelayMs: 10,
		easycodeHome: options.baseHome,
		runsRoot: options.runsRoot,
		events: options.events,
	});
}

async function checkRunHomeLifecycle(baseHome) {
	const runsRoot = await makeTempDir('pong-smoke-runs-');
	const home = await runtime.createRunHome({ baseHome, runsRoot, runId: 'run-lifecycle' });
	assert('run home created', existsSync(home.home));
	assert('config seeded', existsSync(path.join(home.home, 'config.toml')));
	await runtime.cleanupRunHome(home);
	assert('run home removed', !existsSync(home.home));
	await runtime.cleanupRunHome(home);
	record('createRunHome/cleanupRunHome', true, home.home);
}

async function checkStaleCleanup(baseHome) {
	const runsRoot = await makeTempDir('pong-smoke-runs-');
	const stale = await runtime.createRunHome({ baseHome, runsRoot, runId: 'run-stale' });
	const fresh = await runtime.createRunHome({ baseHome, runsRoot, runId: 'run-fresh' });
	const nowMs = Date.now();
	const old = new Date(nowMs - 25 * 60 * 60 * 1_000);
	await utimes(stale.home, old, old);
	const result = await runtime.cleanupStaleRunHomes({
		runsRoot,
		staleTtlMs: 24 * 60 * 60 * 1_000,
		now: () => nowMs,
	});
	assert('stale removed', result.removed.includes(stale.home), JSON.stringify(result.removed));
	assert('fresh kept', result.kept === 1, String(result.kept));
	assert('stale dir gone', !existsSync(stale.home));
	assert('fresh dir kept', existsSync(fresh.home));
	await runtime.cleanupRunHome(fresh);
	record('cleanupStaleRunHomes', true, `scanned=${result.scanned}`);
}

async function checkConcurrentIsolation(baseHome) {
	const runsRoot = await makeTempDir('pong-smoke-runs-');
	const first = createSupervisor({ mode: 'normal', baseHome, runsRoot });
	const second = createSupervisor({ mode: 'normal', baseHome, runsRoot });
	try {
		await Promise.all([first.start(), second.start()]);
		const firstHome = first.initializeResult?.easycodeHome;
		const secondHome = second.initializeResult?.easycodeHome;
		assert('both homes present', firstHome !== undefined && secondHome !== undefined);
		assert('homes differ', firstHome !== secondHome, `${firstHome} vs ${secondHome}`);
		assert('home under runs root', path.dirname(firstHome) === runsRoot);
		await Promise.all([first.shutdown(), second.shutdown()]);
		assert('first home removed', !existsSync(firstHome));
		assert('second home removed', !existsSync(secondHome));
		record('two concurrent runs use distinct homes', true);
	} finally {
		await first.shutdown().catch(() => undefined);
		await second.shutdown().catch(() => undefined);
	}
}

async function checkCrashCleanup(baseHome) {
	const runsRoot = await makeTempDir('pong-smoke-runs-');
	let resolveExit = null;
	const exited = new Promise((resolve) => {
		resolveExit = resolve;
	});
	const supervisor = createSupervisor({
		mode: 'crash-after-ready',
		baseHome,
		runsRoot,
		events: {
			onExit: () => {
				resolveExit?.();
			},
		},
	});
	try {
		await supervisor.start();
		const home = supervisor.runHomePath;
		assert('run home created before crash', home !== null);
		await exited;
		assert('crash cleanup removes home', await waitFor(() => !existsSync(home), 3_000));
		record('crash cleanup', true);
	} finally {
		await supervisor.shutdown().catch(() => undefined);
	}
}

async function checkLeakRegression(baseHome) {
	const runsRoot = await makeTempDir('pong-smoke-runs-');
	const producer = createSupervisor({ mode: 'write-rollout', baseHome, runsRoot });
	try {
		await producer.start();
		const home = producer.runHomePath;
		assert('producer home created', home !== null);
		const rollout = path.join(home, 'sessions', 'rollout-leak-probe.jsonl');
		assert('rollout written', await waitFor(() => existsSync(rollout), 3_000));
		await producer.shutdown();
		assert('producer home removed', !existsSync(home));
		assert('rollout unreachable', !existsSync(rollout));
		const leftovers = (await readdir(runsRoot)).filter((name) => name.startsWith('run-'));
		assert('no run homes left', leftovers.length === 0, leftovers.join(','));
		record('rollout leak regression blocked', true);
	} finally {
		await producer.shutdown().catch(() => undefined);
	}
}

async function main() {
	const args = process.argv.slice(2);
	const smoke = args.includes('--smoke') || args.length === 0;
	if (!smoke) {
		console.log('Use --smoke. See the header comment for details.');
		return;
	}
	try {
		runtime = await import(pathToFileURL(RUNTIME_DIST).href);
	} catch (error) {
		console.error(
			`Cannot load ${RUNTIME_DIST}. Build the package first: ` +
				`pnpm --filter @pong/easycode-runtime build. Cause: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exitCode = 1;
		return;
	}
	const baseHome = await makeTempDir('pong-smoke-base-');
	await writeFile(path.join(baseHome, 'config.toml'), 'model = "fake"\n', 'utf8');
	const checks = [
		['run-home-lifecycle', () => checkRunHomeLifecycle(baseHome)],
		['stale-cleanup', () => checkStaleCleanup(baseHome)],
		['concurrent-isolation', () => checkConcurrentIsolation(baseHome)],
		['crash-cleanup', () => checkCrashCleanup(baseHome)],
		['leak-regression', () => checkLeakRegression(baseHome)],
	];
	for (const [name, check] of checks) {
		try {
			await check();
		} catch (error) {
			record(name, false, error instanceof Error ? error.message : String(error));
		}
	}
	for (const dir of created) {
		await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(
			() => undefined,
		);
	}
	const failed = results.filter((result) => !result.ok);
	console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
	if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error('[isolation-smoke] fatal:', error);
	process.exitCode = 1;
});
