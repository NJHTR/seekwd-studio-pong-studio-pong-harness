#!/usr/bin/env node
// Shared helpers for the M0 fault-injection and A/B baseline scripts.
//
// The host side is the real `@pong/easycode-runtime` package (built `dist/`),
// so the scripts exercise the shipped transport, supervisor, and approval
// broker instead of a private reimplementation. The child is the real
// easycode.exe for recorded runs, or `fake-app-server.mjs` for `--smoke`.

import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { copyFile, link, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
export const ARTIFACTS_DIR = path.join(SCRIPT_DIR, '.artifacts');
export const FAKE_SERVER_PATH = path.join(SCRIPT_DIR, 'fake-app-server.mjs');
export const RUNTIME_DIST = path.join(
	PROJECT_ROOT,
	'packages',
	'@pong',
	'easycode-runtime',
	'dist',
	'index.js',
);
export const DEFAULT_EXE =
	'C:\\Users\\NJHTR\\IdeaProjects\\easyCode\\dist\\easyCode-windows-x64-portable\\bin\\easycode.exe';
export const REAL_EASYCODE_HOME = process.env.EASYCODE_HOME ?? path.join(os.homedir(), '.easycode');
export const SEEDED_HOME_FILES = ['config.toml', 'auth.json', 'installation_id'];

let runtimePromise = null;

/** Import the built runtime package. The instructions are explicit on failure. */
export function loadRuntime() {
	if (runtimePromise === null) {
		runtimePromise = import(pathToFileURL(RUNTIME_DIST).href).catch((error) => {
			runtimePromise = null;
			throw new Error(
				`cannot load @pong/easycode-runtime from ${RUNTIME_DIST}: ${error.message}\n` +
					'Build it first: pnpm --filter @pong/easycode-runtime build',
			);
		});
	}
	return runtimePromise;
}

export function nowIso() {
	return new Date().toISOString();
}

export function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function round(value, digits = 1) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

/**
 * Block the event loop on purpose. The supervisor's read loop and timers run on
 * this thread, so this is a faithful simulation of a GC pause or a synchronous
 * database write in the host. Node allows Atomics.wait on the main thread.
 */
export function blockEventLoop(ms) {
	const startedAt = Date.now();
	try {
		const cell = new Int32Array(new SharedArrayBuffer(4));
		Atomics.wait(cell, 0, 0, ms);
	} catch {
		const deadline = startedAt + ms;
		while (Date.now() < deadline) {
			// Busy wait fallback when Atomics is unavailable.
		}
	}
	return Date.now() - startedAt;
}

export function runId() {
	return nowIso().replaceAll(/[:.]/gu, '-');
}

export function parseArgs(argv, defaults) {
	const args = { ...defaults };
	for (let i = 0; i < argv.length; i += 1) {
		const token = argv[i];
		if (token === '--help' || token === '-h') {
			args.help = true;
			continue;
		}
		if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`);
		const name = token.slice(2).replace(/-([a-z])/gu, (_match, letter) => letter.toUpperCase());
		if (!(name in args)) throw new Error(`unknown argument: ${token}`);
		const next = argv[i + 1];
		const current = args[name];
		if (typeof current === 'boolean') {
			if (next === 'true' || next === 'false') {
				args[name] = next === 'true';
				i += 1;
			} else {
				args[name] = true;
			}
			continue;
		}
		if (next === undefined || next.startsWith('--')) throw new Error(`${token} needs a value`);
		args[name] = typeof current === 'number' ? Number(next) : next;
		i += 1;
	}
	return args;
}

export async function probeVersion(exe) {
	return await new Promise((resolve) => {
		const child = spawn(exe, ['--version'], { windowsHide: true });
		let text = '';
		child.stdout.on('data', (chunk) => {
			text += String(chunk);
		});
		child.stderr.on('data', (chunk) => {
			text += String(chunk);
		});
		child.on('error', () => resolve('unavailable'));
		child.on('close', (code) => resolve(`${text.trim()} (exit ${code})`));
	});
}

export async function readOptionalFile(filePath) {
	try {
		return await readFile(filePath, 'utf8');
	} catch {
		return null;
	}
}

export async function writeJsonFile(filePath, value) {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeJsonLines(filePath, rows) {
	await mkdir(path.dirname(filePath), { recursive: true });
	const stream = createWriteStream(filePath, { flags: 'w' });
	for (const row of rows) stream.write(`${JSON.stringify(row)}\n`);
	await new Promise((resolve) => stream.end(resolve));
}

export async function makeTempDir(prefix) {
	return await mkdtemp(path.join(os.tmpdir(), prefix));
}

/**
 * Create an isolated EASYCODE_HOME that still authenticates against the real
 * model provider. Hard links avoid copying the credential file's bytes; a copy
 * is the fallback on a different volume. The app-server creates its SQLite
 * databases (WAL) in this directory on first use.
 */
export async function seedIsolatedHome(realHome = REAL_EASYCODE_HOME) {
	const home = await makeTempDir('easycode-home-');
	const seeded = [];
	for (const name of SEEDED_HOME_FILES) {
		const source = path.join(realHome, name);
		const target = path.join(home, name);
		try {
			await link(source, target);
			seeded.push({ name, mode: 'hardlink' });
		} catch {
			try {
				await copyFile(source, target);
				seeded.push({ name, mode: 'copy' });
			} catch (error) {
				seeded.push({ name, mode: `missing: ${error.code ?? error.message}` });
			}
		}
	}
	return { home, seeded };
}

export async function readDirectorySizes(dir) {
	const { readdir, stat } = await import('node:fs/promises');
	const sizes = {};
	let total = 0;
	let collection = [];
	try {
		collection = await readdir(dir, { withFileTypes: true });
	} catch {
		return { totalBytes: 0, files: {} };
	}
	for (const entry of collection) {
		if (!entry.isFile()) continue;
		const stats = await stat(path.join(dir, entry.name)).catch(() => null);
		if (stats === null) continue;
		sizes[entry.name] = stats.size;
		total += stats.size;
	}
	return { totalBytes: total, files: sizes };
}

/** Working-set/private memory sample for one PID via PowerShell. */
export async function readProcessMemory(pid) {
	if (!pid) return { workingSetMb: null, privateMb: null };
	const command = `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if($p){[Console]::WriteLine("$($p.WorkingSet64) $($p.PrivateMemorySize64)")}`;
	try {
		const output = await new Promise((resolve, reject) => {
			const child = spawn(
				'powershell.exe',
				['-NoProfile', '-NonInteractive', '-Command', command],
				{
					windowsHide: true,
				},
			);
			let text = '';
			let errorText = '';
			child.stdout.on('data', (chunk) => {
				text += String(chunk);
			});
			child.stderr.on('data', (chunk) => {
				errorText += String(chunk);
			});
			child.on('error', reject);
			child.on('close', (code) => {
				if (code === 0) resolve(text);
				else reject(new Error(`process memory probe exited ${code}: ${errorText.trim()}`));
			});
		});
		const [workingSet, privateBytes] = output.trim().split(/\s+/u).map(Number);
		return {
			workingSetMb: Number.isFinite(workingSet) ? round(workingSet / 1024 / 1024) : null,
			privateMb: Number.isFinite(privateBytes) ? round(privateBytes / 1024 / 1024) : null,
		};
	} catch {
		return { workingSetMb: null, privateMb: null };
	}
}

export function summarize(value) {
	if (value === undefined) return undefined;
	const text = JSON.stringify(value);
	return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

export function collectAgentText(notification) {
	const items = notification?.params?.turn?.items;
	if (!Array.isArray(items)) return '';
	return items
		.filter((item) => item !== null && typeof item === 'object' && item.type === 'agentMessage')
		.map((item) => item.text)
		.join('\n');
}

const BUSY_PATTERN =
	/database is locked|database table is locked|SQLITE_BUSY|sqlite3_busy|busy_timeout|resource busy|EBUSY|lock(\s|ed)/iu;

export function looksLikeBusyError(text) {
	return typeof text === 'string' && BUSY_PATTERN.test(text);
}

/**
 * Event recorder. Writes `events.jsonl` (captured notifications and approval
 * requests), `stderr.log`, and keeps counters for the summary. Inbound
 * responses are not exposed by the transport API, so the artifact is a record
 * of notifications, requests, decisions, and stderr, not of every raw frame.
 */
export class Recorder {
	constructor(outDir) {
		mkdirSync(outDir, { recursive: true });
		this.outDir = outDir;
		this.counts = {};
		this.total = 0;
		this.notifications = [];
		this.items = new Map();
		this.approvalRequests = [];
		this.decisions = [];
		this.tokenUsage = [];
		this.stderrLines = [];
		this.busyStderrLines = [];
		this.progress = [];
		this.eventsStream = createWriteStream(path.join(outDir, 'events.jsonl'), { flags: 'w' });
		this.stderrStream = createWriteStream(path.join(outDir, 'stderr.log'), { flags: 'w' });
	}

	notification(notification) {
		this.total += 1;
		const method = typeof notification.method === 'string' ? notification.method : '(unknown)';
		this.counts[method] = (this.counts[method] ?? 0) + 1;
		this.notifications.push(notification);
		if (this.notifications.length > 20_000) this.notifications.shift();
		this.eventsStream.write(
			`${JSON.stringify({ ts: nowIso(), kind: 'notification', notification })}\n`,
		);
		this.trackItem(notification);
		if (method === 'thread/tokenUsage/updated') this.trackTokenUsage(notification.params);
	}

	trackItem(notification) {
		if (notification.method !== 'item/completed') return;
		const params = notification.params;
		const item = params?.item;
		if (item === null || typeof item !== 'object') return;
		this.items.set(item.id, {
			turnId: params.turnId ?? null,
			type: item.type ?? null,
			status: item.status ?? null,
			exitCode: item.exitCode ?? null,
			command: item.command ?? null,
		});
	}

	trackTokenUsage(params) {
		const usage = params?.tokenUsage;
		if (usage === null || typeof usage !== 'object') return;
		this.tokenUsage.push({
			threadId: params.threadId ?? null,
			turnId: params.turnId ?? null,
			total: usage.total ?? null,
			last: usage.last ?? null,
			atMs: Date.now(),
		});
		if (this.tokenUsage.length > 20_000) this.tokenUsage.shift();
	}

	approvalRequest(entry) {
		this.approvalRequests.push(entry);
		this.eventsStream.write(
			`${JSON.stringify({ ts: nowIso(), kind: 'approval-request', entry })}\n`,
		);
	}

	decision(entry) {
		this.decisions.push(entry);
		this.eventsStream.write(`${JSON.stringify({ ts: nowIso(), kind: 'decision', entry })}\n`);
	}

	stderr(line) {
		this.stderrLines.push(line);
		if (this.stderrLines.length > 20_000) this.stderrLines.shift();
		if (looksLikeBusyError(line)) this.busyStderrLines.push(line);
		this.stderrStream.write(`${line}\n`);
	}

	note(message) {
		this.progress.push({ ts: nowIso(), message });
		this.eventsStream.write(`${JSON.stringify({ ts: nowIso(), kind: 'note', message })}\n`);
	}

	itemsForTurn(turnId) {
		return [...this.items.values()].filter((entry) => entry.turnId === turnId);
	}

	tokenRowsForTurn(turnId) {
		return this.tokenUsage.filter((row) => row.turnId === turnId);
	}

	close() {
		this.eventsStream.end();
		this.stderrStream.end();
	}
}

function loggerFor(recorder) {
	return {
		debug(message) {
			if (message.startsWith('stderr: ')) recorder.stderr(message.slice('stderr: '.length));
		},
		warn(message) {
			recorder.note(`warn: ${message}`);
		},
		error(message) {
			recorder.note(`error: ${message}`);
		},
	};
}

/**
 * Thin wrapper around AppServerSupervisor that adds token accounting, event
 * recording, and a `runTurn` helper. All timing values are host-clock values
 * unless named otherwise.
 */
export class Harness {
	constructor(options) {
		this.options = options;
		this.cwd = options.cwd;
		this.outDir = options.outDir;
		this.recorder = options.recorder ?? new Recorder(this.outDir);
		this.env = options.env ?? { ...process.env };
		this.supervisor = null;
		this.cumulativeByThread = new Map();
		this.hook = options.events ?? {};
		this.startedAtMs = null;
		this.approvalRequests = [];
	}

	async start() {
		const runtime = await loadRuntime();
		const supervisor = new runtime.AppServerSupervisor({
			exePath: this.options.exePath,
			appServerArgs: this.options.appServerArgs,
			cwd: this.cwd,
			env: this.env,
			events: {
				onNotification: (notification) => {
					this.recorder.notification(notification);
					this.trackCumulative(notification);
					this.hook.onNotification?.(notification);
				},
				onApprovalRequest: (request) => {
					const entry = {
						approvalId: request.approvalId,
						kind: request.kind,
						threadId: request.threadId,
						turnId: request.turnId,
						itemId: request.itemId,
						command: request.command,
						reason: request.reason,
						receivedAtMs: request.receivedAtMs,
						deadlineAtMs: request.deadlineAtMs,
						hostReceivedAtMs: Date.now(),
					};
					this.recorder.approvalRequest(entry);
					this.approvalRequests.push(entry);
					return this.hook.onApprovalRequest?.(request);
				},
				onExit: (info) => {
					this.recorder.note(`child exit: ${JSON.stringify(info)}`);
					this.hook.onExit?.(info);
				},
			},
			logger: loggerFor(this.recorder),
			requestTimeoutMs: this.options.requestTimeoutMs,
			approvalTimeoutMs: this.options.approvalTimeoutMs,
			shutdownGraceMs: this.options.shutdownGraceMs,
			shutdownInterruptTimeoutMs: this.options.shutdownInterruptTimeoutMs,
			// M1: isolated per-agent EASYCODE_HOME and initialize-retry policy.
			homeMode: this.options.homeMode,
			easycodeHome: this.options.easycodeHome,
			agentId: this.options.agentId,
			maxInitRestarts: this.options.maxInitRestarts,
			initRetryBaseMs: this.options.initRetryBaseMs,
			initRetryMaxDelayMs: this.options.initRetryMaxDelayMs,
		});
		this.supervisor = supervisor;
		this.startedAtMs = Date.now();
		const initialize = await supervisor.start();
		this.recorder.note(`handshake: ${JSON.stringify(initialize)}`);
		this.hook.onStarted?.({ initialize, supervisor });
		return initialize;
	}

	trackCumulative(notification) {
		if (notification.method !== 'thread/tokenUsage/updated') return;
		const params = notification.params ?? {};
		const threadId = params.threadId;
		const total = params.tokenUsage?.total;
		if (typeof threadId !== 'string' || total === null || typeof total !== 'object') return;
		const previous = this.cumulativeByThread.get(threadId) ?? {
			totalTokens: 0,
			inputTokens: 0,
			cachedInputTokens: 0,
			outputTokens: 0,
			reasoningOutputTokens: 0,
		};
		this.cumulativeByThread.set(threadId, {
			totalTokens: Math.max(previous.totalTokens, total.totalTokens ?? 0),
			inputTokens: Math.max(previous.inputTokens, total.inputTokens ?? 0),
			cachedInputTokens: Math.max(previous.cachedInputTokens, total.cachedInputTokens ?? 0),
			outputTokens: Math.max(previous.outputTokens, total.outputTokens ?? 0),
			reasoningOutputTokens: Math.max(
				previous.reasoningOutputTokens,
				total.reasoningOutputTokens ?? 0,
			),
		});
	}

	async startThread(params) {
		const response = await this.supervisor.startThread(params);
		return response;
	}

	async resumeThread(params) {
		return await this.supervisor.resumeThread(params);
	}

	async startTurn(prompt, options = {}) {
		const threadId = options.threadId ?? this.supervisor.currentThreadId;
		if (threadId === null) throw new Error('startTurn needs a thread; call startThread first');
		const startedAtMs = Date.now();
		const baseline = this.cumulativeByThread.get(threadId) ?? null;
		const response = await this.supervisor.startTurn(threadId, prompt, {
			approvalPolicy: options.approvalPolicy,
			sandboxPolicy: options.sandboxPolicy,
			model: options.model,
		});
		return {
			threadId,
			turnId: response.turn.id,
			response,
			startedAtMs,
			baseline,
			requestSentAtMs: startedAtMs,
		};
	}

	async waitForTurn(turnId, timeoutMs) {
		return await this.supervisor.waitForTurnCompleted(turnId, timeoutMs);
	}

	/**
	 * Start a turn, wait for its terminal notification, and produce the same
	 * shape of data for every scenario.
	 */
	async runTurn(prompt, options = {}) {
		const before = await this.startTurn(prompt, options);
		const timeoutMs = options.timeoutMs ?? 300_000;
		let notification = null;
		let error = null;
		try {
			notification = await this.waitForTurn(before.turnId, timeoutMs);
		} catch (thrown) {
			error = thrown instanceof Error ? thrown.message : String(thrown);
		}
		await delay(options.tokenGraceMs ?? 100);
		const usage = this.usageForTurn(before);
		const turn = notification?.params?.turn ?? null;
		return {
			turnId: before.turnId,
			status: turn?.status ?? null,
			durationMs: turn?.durationMs ?? null,
			wallMs: Date.now() - before.startedAtMs,
			error: turn?.error ?? null,
			timeoutError: error,
			agentText: collectAgentText(notification),
			usage,
			items: this.recorder.itemsForTurn(before.turnId),
			notification,
		};
	}

	usageForTurn(turnStart) {
		const rows = this.recorder.tokenRowsForTurn(turnStart.turnId);
		const last = rows.at(-1) ?? null;
		const threadId = turnStart.threadId;
		const baseline = turnStart.baseline ?? {
			totalTokens: 0,
			inputTokens: 0,
			cachedInputTokens: 0,
			outputTokens: 0,
			reasoningOutputTokens: 0,
		};
		const end = this.cumulativeByThread.get(threadId) ?? baseline;
		const delta = {
			totalTokens: Math.max(0, end.totalTokens - baseline.totalTokens),
			inputTokens: Math.max(0, end.inputTokens - baseline.inputTokens),
			cachedInputTokens: Math.max(0, end.cachedInputTokens - baseline.cachedInputTokens),
			outputTokens: Math.max(0, end.outputTokens - baseline.outputTokens),
			reasoningOutputTokens: Math.max(
				0,
				end.reasoningOutputTokens - baseline.reasoningOutputTokens,
			),
		};
		const lastTotal = last?.total ?? null;
		return {
			available: rows.length > 0,
			updates: rows.length,
			turnTotalDelta: delta,
			serverTotal: lastTotal,
			lastRequest: last?.last ?? null,
			modelContextWindow: last?.total?.modelContextWindow ?? null,
		};
	}

	async interrupt(threadId, turnId, timeoutMs) {
		return await this.supervisor.interruptTurn(threadId, turnId, timeoutMs);
	}

	async shutdown() {
		return await this.supervisor.shutdown();
	}

	health() {
		return this.supervisor.healthCheck();
	}

	transportStats() {
		return this.supervisor.healthCheck().transport;
	}
}

/** Split text into lines, dropping CR. */
export function splitLines(text) {
	return `${text ?? ''}`.split(/\r?\n/u);
}

export function redactHomePath(text) {
	if (typeof text !== 'string') return text;
	return text.replaceAll(os.homedir(), '%USERPROFILE%');
}
