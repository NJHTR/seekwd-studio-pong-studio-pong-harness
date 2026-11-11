#!/usr/bin/env node
/**
 * Run Playwright e2e tests against a local pong build with full isolation
 * from your dev environment.
 *
 * What this gives you over `pnpm test:local`:
 *   - **Random free OS port** for pong's HTTP server and the task-runner
 *     broker, so multiple instances can run in parallel without colliding on
 *     `5678`/`5679`. Pin a port with `PONG_BASE_URL=http://localhost:5680 …`
 *     when you need a stable URL for browser inspection.
 *   - **Throwaway `PONG_USER_FOLDER`** under the OS temp dir (cleaned up on
 *     exit). pong creates `.pong/` (sqlite DB, encryption key) inside it, fully
 *     isolated from your local `~/.pong` install.
 *   - **Self-managed pong process** with a readiness check against
 *     `/rest/e2e/reset`, so the run waits for the E2E controller itself. Sets
 *     `PLAYWRIGHT_SKIP_WEBSERVER=true` so Playwright doesn't race to spawn its
 *     own pong.
 *   - **Container-tagged tests included.** Sets `PLAYWRIGHT_ALLOW_CONTAINER_ONLY=true`
 *     so `@licensed`, `@db:reset`, and `@mode:*` tests are picked up by the
 *     local `e2e` project. Service-backed tests still skip because local mode
 *     does not provide the service container helpers.
 *   - **Process-group cleanup.** Spawns pong `detached: true` and SIGTERMs the
 *     whole tree on exit, so `node ./pong` and the task-runner don't get
 *     orphaned to PID 1.
 *
 * Usage:
 *   pnpm test:local:isolated [<playwright args>]
 *   pnpm test:local:isolated tests/e2e/credentials/crud.spec.ts
 *   pnpm test:local:isolated --grep "preview"
 *
 * Pass extra pong env via `PONG_TEST_ENV` (the same convention `test:local`
 * uses). For example, to enable an experimental module before pong boots:
 *
 *   PONG_TEST_ENV='{"PONG_ENABLED_MODULES":"my-module"}' \
 *     pnpm test:local:isolated tests/e2e/my-module
 */

import { spawn, spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { createServer } from 'net';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playwrightDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(playwrightDir, '../../../..');

/** Ask the OS for a free TCP port. Race-y by nature (the port can be claimed
 *  between close() and the consumer's bind), but acceptable for a dev script. */
function getFreePort() {
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.unref();
		srv.on('error', reject);
		srv.listen(0, '127.0.0.1', () => {
			const { port } = srv.address();
			srv.close(() => resolve(port));
		});
	});
}

// Honour an explicit URL if pinned; otherwise grab two free ports — one for
// pong's HTTP server, one for the task-runner broker (default 5679).
let backendUrl;
let port;
let brokerPort;
if (process.env.PONG_BASE_URL) {
	backendUrl = process.env.PONG_BASE_URL;
	port = new URL(backendUrl).port || '80';
	brokerPort = process.env.PONG_RUNNERS_BROKER_PORT ?? String(await getFreePort());
} else {
	port = String(await getFreePort());
	brokerPort = String(await getFreePort());
	backendUrl = `http://localhost:${port}`;
}

// Throwaway home-dir stand-in. pong creates `.pong/` (sqlite DB, encryption
// key) inside it, so this also isolates the DB from any local pong install.
const userFolder = mkdtempSync(path.join(os.tmpdir(), 'pong-test-isolated-'));

// Caller-supplied pong env (same convention as `pnpm test:local`).
const callerTestEnv = (() => {
	try {
		return process.env.PONG_TEST_ENV ? JSON.parse(process.env.PONG_TEST_ENV) : {};
	} catch {
		console.warn('[run-local-isolated] Ignoring malformed PONG_TEST_ENV.');
		return {};
	}
})();

const pongEnv = {
	...process.env,
	E2E_TESTS: 'true',
	// E2E mode reports the Enterprise plan, where the pong Assistant is off by default.
	PONG_INSTANCE_AI_ENABLED: 'true',
	PONG_PORT: port,
	PONG_RUNNERS_BROKER_PORT: brokerPort,
	PONG_USER_FOLDER: userFolder,
	PONG_LOG_LEVEL: process.env.PONG_LOG_LEVEL ?? 'info',
	PONG_RESTRICT_FILE_ACCESS_TO: '',
	...callerTestEnv,
};

console.log(`[run-local-isolated] starting pong on ${backendUrl}`);
console.log(`[run-local-isolated]   user folder: ${userFolder}`);
console.log(`[run-local-isolated]   broker port: ${brokerPort}`);

// `detached: true` puts pong in its own process group so we can SIGTERM the
// whole tree (pnpm + sh + node ./pong + task-runner) on shutdown — without
// this, killing pnpm orphans the actual pong process to PID 1.
const pong = spawn('pnpm', ['start'], {
	cwd: repoRoot,
	env: pongEnv,
	stdio: ['ignore', 'inherit', 'inherit'],
	detached: true,
});

let shuttingDown = false;
function cleanupTempDir() {
	try {
		rmSync(userFolder, { recursive: true, force: true });
	} catch {
		// best-effort
	}
}

function shutdown(code) {
	if (shuttingDown) return;
	shuttingDown = true;
	try {
		// Negative pid → signal the whole process group.
		process.kill(-pong.pid, 'SIGTERM');
	} catch {
		// Group may already be gone.
	}
	cleanupTempDir();
	process.exit(code);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));
process.on('exit', () => {
	if (!shuttingDown && pong.pid) {
		try {
			process.kill(-pong.pid, 'SIGTERM');
		} catch {
			// ignore
		}
		cleanupTempDir();
	}
});
pong.on('exit', (code, signal) => {
	if (!shuttingDown) {
		console.error(`[run-local-isolated] pong exited unexpectedly (code=${code} signal=${signal})`);
		cleanupTempDir();
		process.exit(1);
	}
});

// Poll the actual REST route, not just a health endpoint, so we know controllers
// are registered. We POST `/rest/e2e/reset` with no body — a registered route
// returns 4xx/5xx, an unregistered one returns 404 with an HTML body.
async function waitForPong(timeoutMs = 120_000) {
	const deadline = Date.now() + timeoutMs;
	let lastStatus = 'connection refused';
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${backendUrl}/rest/e2e/reset`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}',
			});
			lastStatus = `HTTP ${res.status}`;
			// 404 with HTML => routes not loaded yet. Anything 2xx/4xx/5xx with
			// JSON body means E2EController is registered and listening.
			if (res.status !== 404) return;
			const text = await res.text();
			if (!text.includes('Cannot POST')) return;
		} catch (err) {
			lastStatus = err.message ?? String(err);
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`pong did not become ready within ${timeoutMs}ms (last: ${lastStatus})`);
}

try {
	await waitForPong();
	console.log('[run-local-isolated] pong ready, launching playwright ...');
} catch (err) {
	console.error(`[run-local-isolated] ${err.message}`);
	shutdown(1);
}

const playwrightEnv = {
	...process.env,
	PONG_BASE_URL: backendUrl,
	RESET_E2E_DB: 'true',
	PLAYWRIGHT_ALLOW_CONTAINER_ONLY: 'true',
	// We've already started + verified pong; tell playwright.config.ts not to
	// race us by spawning its own.
	PLAYWRIGHT_SKIP_WEBSERVER: 'true',
};

// Default scope: full e2e suite. Any CLI args (paths, --grep, --headed, etc.)
// flow through unchanged. If the caller didn't pass an explicit test path,
// fall back to `tests/e2e`.
const userArgs = process.argv.slice(2);
const hasExplicitPath = userArgs.some((a) => a.startsWith('tests/') || a.endsWith('.spec.ts'));
const args = ['exec', 'playwright', 'test', '--project=e2e'];
if (!hasExplicitPath) args.push('tests/e2e');
args.push(...userArgs);

console.log(`[run-local-isolated] pnpm ${args.join(' ')}`);
const result = spawnSync('pnpm', args, {
	cwd: playwrightDir,
	stdio: 'inherit',
	env: playwrightEnv,
});

shutdown(result.status ?? 1);
