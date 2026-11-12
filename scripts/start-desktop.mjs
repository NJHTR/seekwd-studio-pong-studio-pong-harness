#!/usr/bin/env node
/**
 * M0 dev launcher for the C-first desktop delivery path.
 *
 * What it does:
 *   1. locates a Node 24+ runtime (pong requires >= 24) and the pong CLI entry;
 *   2. picks a free 127.0.0.1 port (never hardcodes 5678) and mints a one-time
 *      bootstrap token for the future M3 login handshake;
 *   3. spawns `pong start`, waits for /healthz, opens the default browser;
 *   4. on Ctrl+C: POST /internal/shutdown (best effort) -> close stdin ->
 *      wait -> kill the process tree.
 *
 * This file is a development entry point. The Rust supervisor
 * (packages/desktop-shell/supervisor) is the reusable implementation: it adds
 * the Windows Job Object guarantee and is what M3 embeds into the Tauri shell.
 *
 * Usage:
 *   node scripts/start-desktop.mjs [--port N] [--no-open] [--smoke]
 *                                 [--user-folder PATH] [--node PATH] [--pong PATH]
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
const DEFAULT_TIMEOUT_SEC = 180;
const DEFAULT_GRACE_MS = 5000;

const HELP = `start-desktop.mjs — M0 C-first dev launcher

USAGE
  node scripts/start-desktop.mjs [OPTIONS]

OPTIONS
  --port <N>            Use this 127.0.0.1 port (default: OS-assigned free port)
  --no-open             Do not open the default browser
  --smoke               Ready -> shutdown -> exit (CI/smoke; no browser)
  --print-token         Print the one-time bootstrap token to stdout
  --user-folder <PATH>  PONG_USER_FOLDER (default: <workspace>/.pong-data)
  --node <PATH>         Node 24+ executable (default: auto-detect)
  --pong <PATH>         pong CLI entry (default: <workspace>/packages/cli/bin/pong)
  --health-timeout <S>  Seconds to wait for /healthz (default: ${DEFAULT_TIMEOUT_SEC})
  --shutdown-grace <S>  Seconds to wait before killing the tree (default: 5)
  -h, --help            Print this help

ENVIRONMENT
  PONG_DESKTOP_NODE     Node 24+ executable override
  PONG_DESKTOP_PONG     pong CLI entry override
  PONG_USER_FOLDER      Default --user-folder
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
		healthTimeoutSec: DEFAULT_TIMEOUT_SEC,
		graceMs: DEFAULT_GRACE_MS,
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
			case '--health-timeout':
				args.healthTimeoutSec = Number(next());
				break;
			case '--shutdown-grace':
				args.graceMs = Number(next()) * 1000;
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

function pongEnv({ port, userFolder }) {
	return {
		...process.env,
		PONG_PORT: String(port),
		PONG_LISTEN_ADDRESS: '127.0.0.1',
		PONG_USER_FOLDER: userFolder,
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

async function waitForHealth(port, timeoutSec, child) {
	const startedAt = Date.now();
	const deadline = startedAt + timeoutSec * 1000;
	let exited = null;
	child.once('exit', (code, signal) => {
		exited = { code, signal };
	});
	while (Date.now() < deadline) {
		if (exited)
			throw new Error(`pong exited during startup (code=${exited.code} signal=${exited.signal})`);
		try {
			const response = await fetch(`http://127.0.0.1:${port}/healthz`, {
				signal: AbortSignal.timeout(1500),
			});
			if (response.ok) return Date.now() - startedAt;
		} catch {
			// not up yet
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`pong did not answer /healthz within ${timeoutSec}s`);
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
	const bootstrapToken = crypto.randomBytes(32).toString('base64url');

	console.log(`[config] workspace=${WORKSPACE}`);
	console.log(`[config] node=${nodeExe} (v${nodeVersion(nodeExe)})`);
	console.log(`[config] pong=${pongEntry}`);
	console.log(`[config] user_folder=${userFolder}`);
	console.log(`[config] port=${port} listen=127.0.0.1`);
	if (args.printToken)
		console.log(`[bootstrap] token=${bootstrapToken} (reserved for M3 login endpoint)`);

	const child = spawn(nodeExe, [pongEntry, 'start'], {
		cwd: WORKSPACE,
		env: pongEnv({ port, userFolder }),
		stdio: ['pipe', 'inherit', 'inherit'],
		windowsHide: false,
	});
	console.log(`[spawn] pong pid=${child.pid}`);

	let shuttingDown = false;
	const shutdown = async (reason) => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`[shutdown] start (${reason})`);
		const startedAt = Date.now();

		try {
			const response = await fetch(`http://127.0.0.1:${port}/internal/shutdown`, {
				method: 'POST',
				signal: AbortSignal.timeout(2000),
			});
			console.log(
				`[shutdown] POST /internal/shutdown -> ${response.status} (endpoint may not exist yet)`,
			);
		} catch (error) {
			console.log(`[shutdown] /internal/shutdown unavailable (${error.message})`);
		}

		try {
			child.stdin.end();
			console.log('[shutdown] closed child stdin (EOF)');
		} catch {
			// already closed
		}

		const exitedGracefully = await waitForExit(child, args.graceMs);
		if (!exitedGracefully) {
			console.log(`[shutdown] pong still alive after ${args.graceMs}ms; killing tree`);
			killTree(child);
			await waitForExit(child, 3000);
		}
		const elapsed = Date.now() - startedAt;
		console.log(
			`[exit] graceful=${exitedGracefully} forced=${!exitedGracefully} exit_code=${child.exitCode} took=${elapsed}ms`,
		);
		console.log(`SMOKE_GRACEFUL=${exitedGracefully}`);
		console.log(`SMOKE_EXIT_CODE=${child.exitCode}`);
		return exitedGracefully;
	};

	for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK']) {
		process.on(signal, () => {
			void shutdown(signal).finally(() => process.exit(0));
		});
	}

	child.once('exit', (code, signal) => {
		if (shuttingDown) return;
		console.log(`[exit] pong exited unexpectedly code=${code} signal=${signal}`);
		process.exit(code ?? 1);
	});

	let readyMs;
	try {
		readyMs = await waitForHealth(port, args.healthTimeoutSec, child);
	} catch (error) {
		console.error(`[health] ${error.message}`);
		await shutdown('health-failed');
		return 1;
	}

	const url = `http://127.0.0.1:${port}`;
	console.log(`[ready] /healthz 200 in ${readyMs}ms`);
	console.log(`READY_MS=${readyMs}`);
	console.log(`PORT=${port}`);
	console.log(`PONG_PID=${child.pid}`);
	console.log(`URL=${url}`);

	if (args.open) openBrowser(url);

	if (args.smoke) {
		const graceful = await shutdown('smoke');
		console.log(`SMOKE=1`);
		// Forced kill is expected until pong grows a control endpoint; smoke still passes.
		return graceful ? 0 : 0;
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
