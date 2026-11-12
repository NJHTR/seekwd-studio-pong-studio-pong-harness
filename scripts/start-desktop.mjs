#!/usr/bin/env node
/**
 * M0 dev launcher for the C-first desktop delivery path.
 *
 * Contract (matches the Rust supervisor and the pong control plane):
 *   1. mint a random `PONG_CONTROL_TOKEN`, spawn `pong start` on a free
 *      127.0.0.1 port (never 5678);
 *   2. wait `GET /healthz` (liveness), then `GET /healthz/readiness` — the
 *      control plane is only usable after readiness, and cold starts can take
 *      minutes, so the readiness budget defaults to 120 s;
 *   3. verify `GET /internal/control/health` with `x-pong-control-token`;
 *   4. open the browser;
 *   5. on Ctrl+C: `POST /internal/control/shutdown` (202) -> wait for exit ->
 *      close stdin fallback -> kill tree.
 *
 * This is a development entry point. The Rust supervisor
 * (packages/desktop-shell/supervisor) is the reusable implementation: it adds
 * the Windows Job Object guarantee and is what M3 embeds into the Tauri shell.
 *
 * Usage:
 *   node scripts/start-desktop.mjs [--port N] [--no-open] [--smoke]
 *                                 [--readiness-timeout S] [--user-folder PATH]
 *                                 [--node PATH] [--pong PATH]
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.dirname(SCRIPT_DIR);
const CONTROL_TOKEN_HEADER = 'x-pong-control-token';
const DEFAULT_LIVENESS_SEC = 60;
const DEFAULT_READINESS_SEC = 120;
const DEFAULT_SHUTDOWN_SEC = 30;
const DEFAULT_STDIN_GRACE_MS = 5000;
const CONTROL_PROBE_MS = 15000;

const HELP = `start-desktop.mjs — M0 C-first dev launcher

USAGE
  node scripts/start-desktop.mjs [OPTIONS]

OPTIONS
  --port <N>                Use this 127.0.0.1 port (default: OS-assigned free port)
  --no-open                 Do not open the default browser
  --smoke                   Ready -> control shutdown -> assert -> exit (CI/smoke)
  --print-token             Print the generated control token (dev only)
  --user-folder <PATH>      PONG_USER_FOLDER (default: <workspace>/.pong-data)
  --node <PATH>             Node 24+ executable (default: auto-detect)
  --pong <PATH>             pong CLI entry (default: <workspace>/packages/cli/bin/pong)
  --liveness-timeout <S>    Seconds to wait for /healthz (default: ${DEFAULT_LIVENESS_SEC})
  --readiness-timeout <S>   Seconds to wait for /healthz/readiness (default: ${DEFAULT_READINESS_SEC})
  --health-timeout <S>      Deprecated alias for --readiness-timeout
  --shutdown-timeout <S>    Seconds to wait for exit after 202 (default: ${DEFAULT_SHUTDOWN_SEC})
  -h, --help                Print this help

ENVIRONMENT
  PONG_DESKTOP_NODE         Node 24+ executable override
  PONG_DESKTOP_PONG         pong CLI entry override
  PONG_USER_FOLDER          Default --user-folder
`;

function parseArgs(argv) {
	const args = {
		port: undefined,
		open: true,
		smoke: false,
		printToken: false,
		userFolder: process.env.PONG_USER_FOLDER,
		node: process.env.PONG_DESKTOP_NODE,
		pong: process.env.PONG_DESKTOP_PONG,
		livenessSec: DEFAULT_LIVENESS_SEC,
		readinessSec: DEFAULT_READINESS_SEC,
		shutdownSec: DEFAULT_SHUTDOWN_SEC,
	};
	for (let i = 0; i < argv.length; i += 1) {
		const raw = argv[i];
		const [flag, inline] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, undefined];
		const next = () => {
			if (inline !== undefined) return inline;
			i += 1;
			if (i >= argv.length) throw new Error(`${flag} needs a value`);
			return argv[i];
		};
		switch (flag) {
			case '-h':
			case '--help':
				return { help: true };
			case '--port':
				args.port = Number(next());
				if (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535) {
					throw new Error('--port expects 1-65535');
				}
				break;
			case '--no-open':
				args.open = false;
				break;
			case '--smoke':
				args.smoke = true;
				args.open = false;
				break;
			case '--print-token':
				args.printToken = true;
				break;
			case '--user-folder':
				args.userFolder = next();
				break;
			case '--node':
				args.node = next();
				break;
			case '--pong':
				args.pong = next();
				break;
			case '--liveness-timeout':
				args.livenessSec = Number(next());
				break;
			case '--readiness-timeout':
			case '--health-timeout':
				args.readinessSec = Number(next());
				break;
			case '--shutdown-timeout':
				args.shutdownSec = Number(next());
				break;
			default:
				throw new Error(`unknown argument ${raw} (try --help)`);
		}
	}
	return args;
}

function nodeVersion(exe) {
	const result = spawnSync(exe, ['--version'], { encoding: 'utf8', windowsHide: true });
	if (result.status !== 0) return null;
	const match = /^v(\d+)\./.exec((result.stdout || '').trim());
	return match ? Number(match[1]) : null;
}

/** pong needs Node >= 24; prefer the repo-local portable runtime. */
function resolveNode(explicit) {
	const candidates = [
		explicit,
		process.env.PONG_DESKTOP_NODE,
		path.join(WORKSPACE, '.tools', 'node24', 'node.exe'),
		path.join(path.dirname(WORKSPACE), '.tools', 'node24', 'node.exe'),
		process.execPath,
	].filter(Boolean);

	const tried = [];
	for (const candidate of candidates) {
		if (!fs.existsSync(candidate)) {
			tried.push(`${candidate} (missing)`);
			continue;
		}
		const major = nodeVersion(candidate);
		if (major !== null && major >= 24) return candidate;
		tried.push(`${candidate} (v${major ?? '?'}, need >= 24)`);
	}
	throw new Error(
		`no Node 24+ runtime found. Install Node 24 or pass --node <path> / PONG_DESKTOP_NODE.\nTried:\n  ${tried.join('\n  ')}`,
	);
}

function resolvePongEntry(explicit) {
	const candidates = [
		explicit,
		process.env.PONG_DESKTOP_PONG,
		path.join(WORKSPACE, 'packages', 'cli', 'bin', 'pong'),
	].filter(Boolean);
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) return candidate;
	}
	throw new Error(
		`pong CLI entry not found. Looked for:\n  ${candidates.join('\n  ')}\nPass --pong <path>.`,
	);
}

function pickPort(preferred) {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on('error', reject);
		server.listen(preferred ?? 0, '127.0.0.1', () => {
			const { port } = server.address();
			server.close(() => {
				if (preferred && port !== preferred) {
					reject(new Error(`requested port ${preferred} is not available`));
					return;
				}
				resolve(port);
			});
		});
	});
}

function pongEnv({ port, userFolder, controlToken }) {
	return {
		...process.env,
		PONG_PORT: String(port),
		PONG_LISTEN_ADDRESS: '127.0.0.1',
		PONG_USER_FOLDER: userFolder,
		PONG_CONTROL_TOKEN: controlToken,
		// Desktop baseline: loopback only, no telemetry/cloud features, no POSIX
		// settings-file permission enforcement on Windows.
		PONG_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
		PONG_DIAGNOSTICS_ENABLED: 'false',
		PONG_VERSION_NOTIFICATIONS_ENABLED: 'false',
		PONG_TEMPLATES_ENABLED: 'false',
		PONG_PERSONALIZATION_ENABLED: 'false',
		PONG_HIRING_BANNER_ENABLED: 'false',
		PONG_LOG_LEVEL: process.env.PONG_LOG_LEVEL ?? 'info',
		PONG_DESKTOP_SUPERVISOR: '1',
	};
}

async function requestStatus(url, { method = 'GET', token, timeoutMs = 2000 } = {}) {
	const headers = token ? { [CONTROL_TOKEN_HEADER]: token } : {};
	const response = await fetch(url, { method, headers, signal: AbortSignal.timeout(timeoutMs) });
	return { status: response.status, body: await response.text() };
}

/** Polls one endpoint until 2xx within the budget; fails fast on child exit. */
async function waitFor2xx({ url, budgetMs, label, exitedRef }) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < budgetMs) {
		if (exitedRef.exited) {
			throw new Error(`pong exited during startup (code=${exitedRef.exited.code})`);
		}
		try {
			const { status } = await requestStatus(url, { timeoutMs: 1500 });
			if (status >= 200 && status < 300) return Date.now() - startedAt;
		} catch {
			// not up yet
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`${label} did not return 2xx within ${Math.round(budgetMs / 1000)}s`);
}

async function waitForControl({ port, token, exitedRef }) {
	const url = `http://127.0.0.1:${port}/internal/control/health`;
	const startedAt = Date.now();
	let last = 'not probed';
	while (Date.now() - startedAt < CONTROL_PROBE_MS) {
		if (exitedRef.exited) throw new Error('pong exited during control probe');
		try {
			const { status, body } = await requestStatus(url, { token, timeoutMs: 1500 });
			if (status === 200 && body.includes('"status":"ok"')) return Date.now() - startedAt;
			last = `HTTP ${status}`;
		} catch (error) {
			last = error.message;
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`control plane not ready after ${CONTROL_PROBE_MS}ms (last: ${last})`);
}

function openBrowser(url) {
	try {
		if (process.platform === 'win32') {
			spawn('cmd', ['/c', 'start', '', url], {
				stdio: 'ignore',
				windowsHide: true,
				detached: true,
			}).unref();
		} else if (process.platform === 'darwin') {
			spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
		} else {
			spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
		}
		console.log(`[browser] opened ${url}`);
	} catch (error) {
		console.log(`[browser] failed to open (${error.message}); open manually: ${url}`);
	}
}

function killTree(child) {
	if (child.exitCode !== null) return;
	if (process.platform === 'win32') {
		const result = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
			stdio: 'ignore',
			windowsHide: true,
		});
		console.log(`[shutdown] taskkill /T /F /PID ${child.pid} -> status ${result.status}`);
	} else {
		try {
			child.kill('SIGTERM');
		} catch {
			// ignore
		}
	}
}

function waitForExit(child, timeoutMs) {
	if (child.exitCode !== null) return Promise.resolve(true);
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(false), timeoutMs);
		child.once('exit', () => {
			clearTimeout(timer);
			resolve(true);
		});
	});
}

function walBytes(userFolder) {
	const walPath = path.join(userFolder, '.pong', 'database.sqlite-wal');
	try {
		return { bytes: fs.statSync(walPath).size, walPath };
	} catch {
		return { bytes: 0, walPath };
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		process.stdout.write(HELP);
		return 0;
	}

	const nodeExe = resolveNode(args.node);
	const pongEntry = resolvePongEntry(args.pong);
	const port = await pickPort(args.port);
	const userFolder = args.userFolder ?? path.join(WORKSPACE, '.pong-data');
	const controlToken = process.env.PONG_CONTROL_TOKEN || crypto.randomBytes(32).toString('hex');

	console.log(`[config] workspace=${WORKSPACE}`);
	console.log(`[config] node=${nodeExe} (v${nodeVersion(nodeExe)})`);
	console.log(`[config] pong=${pongEntry}`);
	console.log(`[config] user_folder=${userFolder}`);
	console.log(`[config] port=${port} listen=127.0.0.1`);
	console.log(
		`[config] liveness=${args.livenessSec}s readiness=${args.readinessSec}s shutdown=${args.shutdownSec}s`,
	);
	if (args.printToken) console.log(`[bootstrap] control_token=${controlToken}`);

	const exitedRef = { exited: null };
	const child = spawn(nodeExe, [pongEntry, 'start'], {
		cwd: WORKSPACE,
		env: pongEnv({ port, userFolder, controlToken }),
		stdio: ['pipe', 'inherit', 'inherit'],
		windowsHide: false,
	});
	child.once('exit', (code, signal) => {
		exitedRef.exited = { code, signal };
	});
	console.log(`[spawn] pong pid=${child.pid}`);

	let shuttingDown = false;
	const shutdown = async (reason) => {
		if (shuttingDown) {
			return { graceful: false, forced: false, httpStatus: null, exitWaitMs: 0, wal: -1 };
		}
		shuttingDown = true;
		const startedAt = Date.now();
		console.log(`[shutdown] start (${reason})`);

		// 1) Control endpoint; only 202 counts.
		let httpStatus = null;
		let controlAccepted = false;
		const exitStartedAt = Date.now();
		try {
			const response = await requestStatus(`http://127.0.0.1:${port}/internal/control/shutdown`, {
				method: 'POST',
				token: controlToken,
				timeoutMs: 5000,
			});
			httpStatus = response.status;
			console.log(`[shutdown] POST /internal/control/shutdown -> ${response.status}`);
			controlAccepted = response.status === 202;
		} catch (error) {
			console.log(`[shutdown] control shutdown failed (${error.message})`);
		}

		// 2) Wait for graceful exit after 202.
		let graceful = false;
		let exitWaitMs = 0;
		if (controlAccepted) {
			graceful = await waitForExit(child, args.shutdownSec * 1000);
			exitWaitMs = Date.now() - exitStartedAt;
			console.log(
				`[shutdown] ${graceful ? 'pong exited gracefully' : 'pong still alive'} after ${exitWaitMs}ms`,
			);
		}

		// 3) Fallback: close stdin, short grace, then kill tree.
		let usedStdinFallback = false;
		if (!graceful) {
			usedStdinFallback = true;
			try {
				child.stdin.end();
				console.log('[shutdown] closed child stdin (EOF fallback)');
			} catch {
				// already closed
			}
			graceful = await waitForExit(child, DEFAULT_STDIN_GRACE_MS);
			if (graceful) {
				exitWaitMs = Date.now() - exitStartedAt;
				console.log('[shutdown] pong exited after stdin EOF');
			}
		}

		const forced = !graceful;
		if (forced) {
			console.log('[shutdown] killing process tree');
			killTree(child);
			await waitForExit(child, 3000);
		}
		const totalMs = Date.now() - startedAt;
		const { bytes: wal, walPath } = walBytes(userFolder);
		console.log(
			`[exit] SHUTDOWN_HTTP=${httpStatus} graceful=${graceful} stdin_fallback=${usedStdinFallback} forced=${forced} exit_code=${child.exitCode} exit_wait_ms=${exitWaitMs} total_ms=${totalMs}`,
		);
		console.log(`[exit] WAL_BYTES=${wal} WAL_PATH=${walPath}`);
		return { graceful, forced, httpStatus, exitWaitMs, totalMs, wal, walPath };
	};

	for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK']) {
		process.on(signal, () => {
			void shutdown(signal).finally(() => process.exit(0));
		});
	}

	let livenessMs;
	try {
		console.log(`[stage] liveness: GET /healthz (budget ${args.livenessSec}s)`);
		livenessMs = await waitFor2xx({
			url: `http://127.0.0.1:${port}/healthz`,
			budgetMs: args.livenessSec * 1000,
			label: '/healthz',
			exitedRef,
		});
		console.log(`[stage] liveness 200 in ${livenessMs}ms`);
	} catch (error) {
		console.error(`[stage] liveness FAILED: ${error.message}`);
		const report = await shutdown('liveness-failed');
		return report.forced ? 1 : 0;
	}

	let readinessMs;
	try {
		const remaining = args.readinessSec * 1000 - livenessMs;
		console.log(
			`[stage] readiness: GET /healthz/readiness (remaining budget ${Math.round(remaining / 1000)}s)`,
		);
		readinessMs = await waitFor2xx({
			url: `http://127.0.0.1:${port}/healthz/readiness`,
			budgetMs: Math.max(remaining, 1000),
			label: '/healthz/readiness',
			exitedRef,
		});
		console.log(`[stage] readiness 200 in ${readinessMs}ms (total ${livenessMs + readinessMs}ms)`);
	} catch (error) {
		console.error(
			`[stage] readiness FAILED: ${error.message} (raise --readiness-timeout for cold starts)`,
		);
		const report = await shutdown('readiness-failed');
		return report.forced ? 1 : 0;
	}

	let controlMs;
	try {
		controlMs = await waitForControl({ port, token: controlToken, exitedRef });
		console.log(`[stage] control 200 in ${controlMs}ms`);
	} catch (error) {
		console.error(`[stage] control UNAVAILABLE: ${error.message}`);
		console.error('[stage] WARN: shutdown will fall back to stdin + kill tree');
	}

	const url = `http://127.0.0.1:${port}`;
	console.log(`[ready] READY_TOTAL_MS=${livenessMs + readinessMs + (controlMs ?? 0)}`);
	console.log(`[ready] LIVENESS_MS=${livenessMs}`);
	console.log(`[ready] READINESS_MS=${readinessMs}`);
	console.log(`[ready] CONTROL_READY=${controlMs !== undefined}`);
	console.log(`[ready] PORT=${port}`);
	console.log(`[ready] PONG_PID=${child.pid}`);
	console.log(`[ready] URL=${url}`);

	if (args.open) openBrowser(url);

	if (args.smoke) {
		const report = await shutdown('smoke');
		const failures = [];
		if (report.httpStatus !== 202) failures.push(`expected 202, got ${report.httpStatus}`);
		if (!report.graceful) failures.push('not graceful');
		if (report.forced) failures.push('forced kill');
		if (child.exitCode !== 0) failures.push(`expected exit code 0, got ${child.exitCode}`);
		if (report.wal !== 0) failures.push(`WAL not truncated (${report.wal} bytes)`);
		console.log(`SMOKE_HTTP=${report.httpStatus}`);
		console.log(`SMOKE_GRACEFUL=${report.graceful}`);
		console.log(`SMOKE_FORCED=${report.forced}`);
		console.log(`SMOKE_EXIT_CODE=${child.exitCode}`);
		console.log(`SMOKE_WAL_BYTES=${report.wal}`);
		console.log(`SMOKE=${failures.length === 0 ? 'PASS' : 'FAIL'}`);
		console.log(`SMOKE_FAILURES=${failures.length === 0 ? 'none' : failures.join(' | ')}`);
		return failures.length === 0 ? 0 : 1;
	}

	// Foreground: keep the promise chain alive until a signal arrives.
	await new Promise(() => {});
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`[fatal] ${error.message}`);
		process.exit(1);
	});
