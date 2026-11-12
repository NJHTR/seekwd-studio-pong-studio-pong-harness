#!/usr/bin/env node
// M0 PoC: exercise the easyCode app-server wire protocol on a real Windows binary.
//
// easyCode speaks a custom JSONL envelope, not JSON-RPC 2.0:
//   request        {id, method, params}
//   response       {id, result} | {id, error}
//   notification   {method, params}
// The client never awaits inside the stdout read loop. It queues outbound lines
// and writes them with backpressure handling, because a full stdin pipe blocks
// the server's only outbound route and can stall approval delivery.
//
// Usage:
//   node scripts/poc/easycode-poc.mjs --phase all
//   node scripts/poc/easycode-poc.mjs --phase smoke
//   node scripts/poc/easycode-poc.mjs --phase long --long-minutes 30
//
// Flags:
//   --phase <smoke|turn|tool|interrupt|resume|long|all>  Default: all.
//   --exe <path>        easycode.exe path. Default: EASYCODE_EXE or the
//                       portable dist location used by the M0 machine.
//   --long-minutes <n>  Long-session duration. Default: 30.
//   --turn-timeout <s>  Per-turn completion timeout. Default: 300.
//   --out-dir <path>    Artifact directory. Default: scripts/poc/.artifacts/<runId>.
//
// Artifacts: raw.jsonl, summary.json, app-server.stderr.log.

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_EXE =
	'C:\\Users\\NJHTR\\IdeaProjects\\easyCode\\dist\\easyCode-windows-x64-portable\\bin\\easycode.exe';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const NOTIFICATION_BUFFER = 500;
const APPROVAL_TIMEOUT_MS = 120_000;
const ECHO_TOOL = {
	type: 'function',
	name: 'pong_echo',
	description: 'Echo the input text back to the caller.',
	inputSchema: {
		type: 'object',
		properties: { text: { type: 'string', description: 'Text to echo.' } },
		required: ['text'],
		additionalProperties: false,
	},
};
const READ_ONLY_TURN_SANDBOX = {
	type: 'readOnly',
	networkAccess: false,
};
const WORKSPACE_WRITE_TURN_SANDBOX = (writableRoot) => ({
	type: 'workspaceWrite',
	writableRoots: [writableRoot],
	networkAccess: 'restricted',
	excludeTmpdirEnvVar: false,
	excludeSlashTmp: true,
});

function parseArgs(argv) {
	const args = {
		phase: 'all',
		exe: process.env.EASYCODE_EXE ?? DEFAULT_EXE,
		longMinutes: 30,
		turnTimeoutS: 300,
		secondInterruptTimeoutS: 30,
		outDir: null,
	};
	for (let i = 0; i < argv.length; i += 1) {
		const key = argv[i];
		const next = argv[i + 1];
		if (key === '--phase') {
			args.phase = next;
			i += 1;
		} else if (key === '--exe') {
			args.exe = next;
			i += 1;
		} else if (key === '--long-minutes') {
			args.longMinutes = Number(next);
			i += 1;
		} else if (key === '--turn-timeout') {
			args.turnTimeoutS = Number(next);
			i += 1;
		} else if (key === '--second-interrupt-timeout') {
			args.secondInterruptTimeoutS = Number(next);
			i += 1;
		} else if (key === '--out-dir') {
			args.outDir = next;
			i += 1;
		} else if (key === '--help' || key === '-h') {
			console.log('See the header comment of easycode-poc.mjs for the flags.');
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${key}`);
		}
	}
	return args;
}

function nowIso() {
	return new Date().toISOString();
}

function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function isFiniteNumber(value) {
	return typeof value === 'number' && Number.isFinite(value);
}

function summarize(value) {
	if (value === undefined) return undefined;
	const text = JSON.stringify(value);
	return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

async function probeVersion(exe) {
	return new Promise((resolve) => {
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

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const runId = new Date().toISOString().replaceAll(/[:.]/gu, '-');
	const outDir = path.resolve(args.outDir ?? path.join(SCRIPT_DIR, '.artifacts', runId));
	await mkdir(outDir, { recursive: true });

	const versionText = await probeVersion(args.exe);
	const workDir = await mkdtemp(path.join(tmpdir(), 'easycode-poc-'));
	await writeFile(path.join(workDir, 'poc-input.txt'), 'pong-m0-poc input line\n', 'utf8');

	const summary = {
		meta: {
			startedAt: nowIso(),
			runId,
			node: process.version,
			platform: `${process.platform}-${process.arch}`,
			exe: args.exe,
			version: versionText,
			workDir,
			phase: args.phase,
			longMinutes: args.longMinutes,
			secondInterruptTimeoutS: args.secondInterruptTimeoutS,
		},
		phases: {},
		failures: [],
	};
	const recorder = new EventRecorder(outDir);
	const client = new AppServerClient({ exe: args.exe, cwd: workDir, outDir, recorder });
	summary.meta.pid = client.child.pid;

	const fail = (phase, error) => {
		const message = error instanceof Error ? error.message : String(error);
		summary.failures.push({ phase, message });
		console.error(`[poc] ${phase} failed: ${message}`);
	};

	try {
		const startedAt = Date.now();
		await client.start();
		summary.phases.handshake = await runHandshake(client);
		summary.phases.handshake.ms = Date.now() - startedAt;
		if (args.phase !== 'smoke') {
			summary.phases.threadStart = await runThreadStart(client, summary, workDir);
			if (hasPhase(args.phase, 'turn')) {
				summary.phases.realTaskTurn = await runRealTaskTurn(client, summary);
			}
			if (hasPhase(args.phase, 'tool')) {
				summary.phases.dynamicTool = await runDynamicToolTurn(client, summary);
			}
			if (hasPhase(args.phase, 'interrupt')) {
				summary.phases.interrupt = await runInterrupt(client, summary, args);
			}
			if (hasPhase(args.phase, 'resume')) {
				summary.phases.resume = await runResume(client, summary);
			}
			if (hasPhase(args.phase, 'long')) {
				summary.phases.longSession = await runLongSession(client, summary, args);
			}
		}
		summary.phases.shutdown = await client.shutdown();
	} catch (error) {
		fail('run', error);
		summary.phases.aborted = true;
		try {
			summary.phases.shutdown = await client.shutdown();
		} catch (shutdownError) {
			fail('shutdown', shutdownError);
		}
	} finally {
		await client.closeArtifacts();
	}

	summary.meta.finishedAt = nowIso();
	summary.meta.durationMs =
		Date.parse(summary.meta.finishedAt) - Date.parse(summary.meta.startedAt);
	summary.counts = recorder.counts;
	summary.eventCount = recorder.total;
	summary.approvals = recorder.approvalLog;
	summary.toolCalls = recorder.toolCallLog;
	await writeFile(
		path.join(outDir, 'summary.json'),
		`${JSON.stringify(summary, null, 2)}\n`,
		'utf8',
	);
	console.log('\n=== M0 PoC summary ===');
	console.log(JSON.stringify(summary, null, 2));
	console.log(`\nArtifacts: ${outDir}`);
	if (summary.failures.length > 0) process.exitCode = 1;
}

function hasPhase(requested, phase) {
	return requested === 'all' || requested === phase;
}

async function runHandshake(client) {
	const initialize = await client.request('initialize', {
		clientInfo: { name: 'pong-m0-poc', title: 'pong M0 PoC', version: '0.1.0' },
		capabilities: { experimentalApi: true, requestAttestation: false },
	});
	client.notify('initialized');
	return {
		userAgent: initialize.userAgent,
		easycodeHome: initialize.easycodeHome,
		platformFamily: initialize.platformFamily,
		platformOs: initialize.platformOs,
		ms: null,
	};
}

async function runThreadStart(client, summary, workDir) {
	const startedAt = Date.now();
	const response = await client.request(
		'thread/start',
		{
			cwd: workDir,
			approvalPolicy: 'on-request',
			approvalsReviewer: 'user',
			sandbox: 'workspace-write',
			ephemeral: false,
			threadSource: 'pong-m0-poc',
			dynamicTools: [ECHO_TOOL],
		},
		60_000,
	);
	summary.threadId = response.thread.id;
	summary.trackedTurnId = null;
	return {
		ms: Date.now() - startedAt,
		threadId: response.thread.id,
		model: response.model,
		modelProvider: response.modelProvider,
		cwd: response.cwd,
		approvalPolicy: response.approvalPolicy,
		sandbox: response.sandbox,
	};
}

async function startTurnAndWait(client, summary, options) {
	const previousCounts = { ...client.recorder.counts };
	const requestStartedAt = Date.now();
	const response = await client.request(
		'turn/start',
		{
			threadId: summary.threadId,
			input: [{ type: 'text', text: options.prompt, text_elements: [] }],
			...(options.sandboxPolicy ? { sandboxPolicy: options.sandboxPolicy } : {}),
			...(options.approvalPolicy ? { approvalPolicy: options.approvalPolicy } : {}),
		},
		60_000,
	);
	const turnId = response.turn.id;
	client.currentThreadId = summary.threadId;
	client.lastTurnId = turnId;
	const completed = await client.waitForTurnCompletion(turnId, options.turnTimeoutS * 1000);
	client.lastTurnId = null;
	const result = {
		turnId,
		startMs: Date.now() - requestStartedAt,
		status: completed.turn.status,
		turnDurationMs: completed.turn.durationMs ?? null,
		error: completed.turn.error,
		turnItems: completed.turn.items,
		agentText: collectAgentText(completed.turn),
		eventDelta: diffCounts(previousCounts, client.recorder.counts),
	};
	if (result.status !== 'completed') {
		summary.failures.push({ phase: options.label, message: `turn status was ${result.status}` });
	}
	return result;
}

function collectAgentText(turn) {
	if (!Array.isArray(turn.items)) return '';
	return turn.items
		.filter((item) => item && item.type === 'agentMessage')
		.map((item) => item.text)
		.join('\n');
}

function diffCounts(before, after) {
	const delta = {};
	for (const [method, count] of Object.entries(after)) {
		const previous = before[method] ?? 0;
		if (count > previous) delta[method] = count - previous;
	}
	return delta;
}

function sumCounts(counts) {
	return Object.values(counts).reduce((total, value) => total + value, 0);
}

function runRealTaskTurn(client, summary) {
	return (async () => {
		const result = await startTurnAndWait(client, summary, {
			label: 'realTaskTurn',
			turnTimeoutS: 300,
			// The thread default is on-request. This turn uses untrusted so the
			// write command deterministically produces one command approval.
			approvalPolicy: 'untrusted',
			sandboxPolicy: READ_ONLY_TURN_SANDBOX,
			prompt: [
				'You are working in the current directory. Do these steps in order.',
				'1. Read the file poc-input.txt.',
				'2. Run this exact shell command once: echo poc-updated >> poc-notes.txt',
				'3. Read the file poc-notes.txt and reply with its content.',
			].join('\n'),
		});
		const approvals = client.recorder.approvalLog.filter((entry) => entry.turnId === result.turnId);
		const toolCalls = client.recorder.toolCallLog.filter((entry) => entry.turnId === result.turnId);
		const notes = await readOptionalFile(path.join(summary.meta.workDir, 'poc-notes.txt'));
		const commandItems = [...client.recorder.itemLog.values()].filter(
			(entry) => entry.turnId === result.turnId && entry.type === 'commandExecution',
		);
		const resultWithArtifacts = {
			...result,
			approvals,
			toolCalls,
			notesContent: notes === null ? null : normalizePowerShellText(notes),
			commandItems,
		};
		if (approvals.length === 0) {
			summary.failures.push({
				phase: 'realTaskTurn',
				message: 'no command approval request was observed',
			});
		}
		if (
			approvals.some((entry) => entry.method === 'item/commandExecution/requestApproval') === false
		) {
			summary.failures.push({
				phase: 'realTaskTurn',
				message: 'approval was not a command approval',
			});
		}
		if (notes === null) {
			summary.failures.push({ phase: 'realTaskTurn', message: 'poc-notes.txt was not created' });
		}
		return resultWithArtifacts;
	})();
}

function collectCommandItems(items) {
	if (!Array.isArray(items)) return [];
	return items
		.filter((item) => item && item.type === 'commandExecution')
		.map((item) => ({
			command: item.command,
			status: item.status,
			exitCode: item.exitCode ?? null,
			durationMs: item.durationMs ?? null,
			aggregatedOutput: item.aggregatedOutput ?? null,
		}));
}

function normalizePowerShellText(text) {
	// PowerShell 5.1 redirection writes UTF-16LE with a BOM. Strip NUL bytes so
	// the summary stays readable, and record that the file used UTF-16.
	return text.replaceAll('\u0000', '').replace(/^\uFEFF/u, '');
}

function runDynamicToolTurn(client, summary) {
	return (async () => {
		const result = await startTurnAndWait(client, summary, {
			label: 'dynamicTool',
			turnTimeoutS: 300,
			prompt:
				'Call the pong_echo tool exactly once with {"text":"pong-poc"}. Then reply with the tool output.',
			sandboxPolicy: READ_ONLY_TURN_SANDBOX,
		});
		const toolCalls = client.recorder.toolCallLog.filter((entry) => entry.turnId === result.turnId);
		if (toolCalls.length === 0) {
			summary.failures.push({ phase: 'dynamicTool', message: 'no dynamic tool call was observed' });
		}
		return { ...result, toolCalls };
	})();
}

async function runInterrupt(client, summary, args) {
	const startedAt = Date.now();
	const response = await client.request(
		'turn/start',
		{
			threadId: summary.threadId,
			input: [
				{
					type: 'text',
					text: [
						'This is an interrupt probe.',
						'List the files in the current directory, then read every file and summarize it.',
						'Keep working until you are stopped.',
					].join('\n'),
					text_elements: [],
				},
			],
		},
		60_000,
	);
	const turnId = response.turn.id;
	client.currentThreadId = summary.threadId;
	client.lastTurnId = turnId;
	await delay(2500);
	const interruptStartedAt = Date.now();
	const interruptResponse = await client.request(
		'turn/interrupt',
		{ threadId: summary.threadId, turnId },
		30_000,
	);
	const interruptMs = Date.now() - interruptStartedAt;
	const completed = await client.waitForTurnCompletion(turnId, 30_000);
	client.lastTurnId = null;
	let secondInterrupt;
	const secondTimeoutMs = args.secondInterruptTimeoutS * 1000;
	try {
		await client.request('turn/interrupt', { threadId: summary.threadId, turnId }, secondTimeoutMs);
		secondInterrupt = {
			error: null,
			note: 'second interrupt succeeded',
			timeoutMs: secondTimeoutMs,
		};
	} catch (error) {
		secondInterrupt = {
			error: error instanceof Error ? error.message : String(error),
			timeoutMs: secondTimeoutMs,
		};
	}
	const terminalStatus = completed.turn.status;
	if (terminalStatus !== 'interrupted' && terminalStatus !== 'completed') {
		summary.failures.push({ phase: 'interrupt', message: `terminal status was ${terminalStatus}` });
	}
	return {
		turnId,
		interruptResponse,
		interruptMs,
		terminalStatus,
		terminalError: completed.turn.error,
		ms: Date.now() - startedAt,
		secondInterrupt,
	};
}

async function runResume(client, summary) {
	const startedAt = Date.now();
	// thread/resume needs a persisted rollout, so complete one turn first. A
	// freshly started thread has no rollout and resume fails with
	// "no rollout found for thread id".
	const warmup = await startTurnAndWait(client, summary, {
		label: 'resumeWarmup',
		turnTimeoutS: 300,
		prompt: 'This is a resume warmup. Reply with the single word OK.',
		sandboxPolicy: READ_ONLY_TURN_SANDBOX,
	});
	const response = await client.request(
		'thread/resume',
		{ threadId: summary.threadId, excludeTurns: true },
		60_000,
	);
	const smallTurn = await startTurnAndWait(client, summary, {
		label: 'resume',
		turnTimeoutS: 300,
		prompt: 'This is a resume probe. Reply with the single word OK.',
		sandboxPolicy: READ_ONLY_TURN_SANDBOX,
	});
	if (smallTurn.status !== 'completed') {
		summary.failures.push({
			phase: 'resume',
			message: `post-resume turn status was ${smallTurn.status}`,
		});
	}
	return {
		ms: Date.now() - startedAt,
		threadId: response.thread.id,
		model: response.model,
		status: response.thread.status,
		warmupTurn: warmup,
		postResumeTurn: smallTurn,
	};
}

async function runLongSession(client, summary, args) {
	const startedAt = Date.now();
	const deadline = startedAt + args.longMinutes * 60_000;
	const samples = [];
	const turns = [];
	let failures = 0;
	let turnIndex = 0;
	while (Date.now() < deadline) {
		const turnStartedAt = Date.now();
		try {
			const result = await startTurnAndWait(client, summary, {
				label: 'longSession',
				turnTimeoutS: args.turnTimeoutS,
				prompt: `Long-session probe turn ${turnIndex + 1}. Reply with the single word OK.`,
				sandboxPolicy: READ_ONLY_TURN_SANDBOX,
			});
			turns.push({
				turnId: result.turnId,
				status: result.status,
				durationMs: result.turnDurationMs,
				events: sumCounts(result.eventDelta),
			});
		} catch (error) {
			failures += 1;
			summary.failures.push({
				phase: 'longSession',
				message: `turn ${turnIndex + 1}: ${error instanceof Error ? error.message : String(error)}`,
			});
			if (failures >= 3) break;
		}
		turnIndex += 1;
		const memory = await readProcessMemory(client.child.pid);
		samples.push({ atSec: Math.round((Date.now() - startedAt) / 1000), ...memory });
		const remaining = deadline - Date.now();
		if (remaining > 0) await delay(Math.min(60_000, remaining));
	}
	const workingSets = samples.map((sample) => sample.workingSetMb).filter(isFiniteNumber);
	const privateSizes = samples.map((sample) => sample.privateMb).filter(isFiniteNumber);
	return {
		minutes: args.longMinutes,
		wallMs: Date.now() - startedAt,
		turns: turns.length,
		failures,
		samples,
		memoryMb: {
			first: workingSets[0] ?? null,
			last: workingSets.at(-1) ?? null,
			min: workingSets.length > 0 ? Math.min(...workingSets) : null,
			max: workingSets.length > 0 ? Math.max(...workingSets) : null,
			privateFirst: privateSizes[0] ?? null,
			privateLast: privateSizes.at(-1) ?? null,
		},
		turnSamples: turns,
	};
}

async function readOptionalFile(filePath) {
	try {
		return await readFile(filePath, 'utf8');
	} catch {
		return null;
	}
}

async function readProcessMemory(pid) {
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
			workingSetMb: Number.isFinite(workingSet)
				? Math.round((workingSet / 1024 / 1024) * 10) / 10
				: null,
			privateMb: Number.isFinite(privateBytes)
				? Math.round((privateBytes / 1024 / 1024) * 10) / 10
				: null,
		};
	} catch {
		return { workingSetMb: null, privateMb: null };
	}
}

class EventRecorder {
	constructor(outDir) {
		this.outDir = outDir;
		this.counts = {};
		this.total = 0;
		this.recent = [];
		this.approvalLog = [];
		this.toolCallLog = [];
		this.itemLog = new Map();
		this.rawStream = createWriteStream(path.join(outDir, 'raw.jsonl'), { flags: 'a' });
	}
	record(direction, message) {
		this.total += 1;
		const method = typeof message.method === 'string' ? message.method : '(response)';
		this.counts[method] = (this.counts[method] ?? 0) + 1;
		const entry = {
			ts: Date.now(),
			dir: direction,
			method,
			id: message.id,
			summary: summarize(message.params ?? message.result ?? message.error),
		};
		this.recent.push(entry);
		if (this.recent.length > NOTIFICATION_BUFFER) this.recent.shift();
		this.rawStream.write(`${JSON.stringify({ ts: nowIso(), direction, message })}\n`);
	}
	recordApproval(entry) {
		this.approvalLog.push(entry);
	}
	recordToolCall(entry) {
		this.toolCallLog.push(entry);
	}
	close() {
		this.rawStream.end();
	}
}

class AppServerClient {
	constructor({ exe, cwd, outDir, recorder }) {
		this.exe = exe;
		this.cwd = cwd;
		this.outDir = outDir;
		this.recorder = recorder;
		this.child = spawn(exe, ['app-server', '--listen', 'stdio://'], {
			cwd,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
		});
		this.child.stdout.setEncoding('utf8');
		this.child.stdin.setDefaultEncoding('utf8');
		this.pending = new Map();
		this.nextId = 1;
		this.outQueue = [];
		this.writeBlocked = false;
		this.turnWaiters = new Map();
		this.completedTurns = new Map();
		this.closed = false;
		this.startupError = null;
		this.currentThreadId = null;
		this.lastTurnId = null;
		this.stderrStream = createWriteStream(path.join(outDir, 'app-server.stderr.log'), {
			flags: 'a',
		});

		this.child.on('error', (error) => {
			this.startupError = error;
			this.rejectAll(error);
		});
		this.child.on('exit', (code, signal) => {
			this.closed = true;
			this.rejectAll(new Error(`app-server exited (code=${code}, signal=${signal})`));
		});
		this.child.stderr.on('data', (chunk) => {
			this.stderrStream.write(chunk);
		});

		// The read loop is synchronous. It parses one line and returns. Handlers
		// run outside this callback, so a slow handler never blocks stdout.
		const lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
		lines.on('line', (line) => {
			this.handleLine(line);
		});
	}

	start() {
		return new Promise((resolve, reject) => {
			if (this.startupError) {
				reject(this.startupError);
				return;
			}
			const onSpawn = () => {
				this.child.off('error', onError);
				resolve();
			};
			const onError = (error) => {
				this.child.off('spawn', onSpawn);
				reject(error);
			};
			this.child.once('spawn', onSpawn);
			this.child.once('error', onError);
		});
	}

	handleLine(line) {
		if (line.trim() === '') return;
		let message;
		try {
			message = JSON.parse(line);
		} catch {
			this.recorder.record('in', { method: '(unparseable)', params: { line } });
			return;
		}
		this.recorder.record('in', message);
		if (message.method !== undefined && message.id !== undefined) {
			void this.handleServerRequest(message).catch((error) => {
				console.error('[poc] server request handler failed:', error);
			});
			return;
		}
		if (message.method !== undefined) {
			this.handleNotification(message);
			return;
		}
		if (message.id !== undefined) this.handleResponse(message);
	}

	handleResponse(message) {
		const waiter = this.pending.get(String(message.id));
		if (!waiter) return;
		this.pending.delete(String(message.id));
		clearTimeout(waiter.timer);
		if (message.error !== undefined) {
			const error = new Error(`${waiter.method}: ${message.error.message ?? 'unknown error'}`);
			error.code = message.error.code;
			error.data = message.error.data;
			waiter.reject(error);
			return;
		}
		waiter.resolve(message.result);
	}

	handleNotification(message) {
		if (message.method === 'item/completed') {
			this.recordInterestingItem(message.params);
			return;
		}
		if (message.method !== 'turn/completed' && message.method !== 'turn/failed') return;
		const params = message.params ?? {};
		const turnId = params.turn?.id;
		const waiter = turnId === undefined ? undefined : this.turnWaiters.get(turnId);
		if (waiter) {
			this.turnWaiters.delete(turnId);
			clearTimeout(waiter.timer);
			waiter.resolve(params);
			return;
		}
		if (turnId !== undefined) this.completedTurns.set(turnId, params);
	}

	recordInterestingItem(params) {
		const item = params?.item;
		if (
			!item ||
			!['commandExecution', 'fileChange', 'dynamicToolCall', 'mcpToolCall'].includes(item.type)
		)
			return;
		const entry = this.recorder.itemLog.get(item.id);
		if (entry) {
			entry.status = item.status ?? null;
			entry.exitCode = item.exitCode ?? null;
			entry.durationMs = item.durationMs ?? null;
			return;
		}
		this.recorder.itemLog.set(item.id, {
			turnId: params.turnId,
			type: item.type,
			command: item.command ?? null,
			status: item.status ?? null,
			exitCode: item.exitCode ?? null,
			durationMs: item.durationMs ?? null,
			tool: item.tool ?? null,
		});
	}

	async handleServerRequest(message) {
		const method = message.method;
		if (
			method === 'item/commandExecution/requestApproval' ||
			method === 'item/fileChange/requestApproval'
		) {
			this.handleApprovalRequest(message);
			return;
		}
		if (method === 'item/permissions/requestApproval') {
			this.respond(message.id, { permissions: {}, scope: 'turn' });
			return;
		}
		if (method === 'item/tool/requestUserInput') {
			const answers = {};
			for (const question of message.params?.questions ?? []) {
				answers[question.id] = { answers: [question.options?.[0]?.label ?? 'poc-answer'] };
			}
			this.respond(message.id, { answers });
			return;
		}
		if (method === 'item/tool/call') {
			const params = message.params ?? {};
			const receivedAt = Date.now();
			const text = extractEchoText(params.arguments);
			this.recorder.recordToolCall({
				turnId: params.turnId,
				callId: params.callId,
				tool: params.tool,
				arguments: params.arguments,
				roundtripMs: Date.now() - receivedAt,
			});
			this.respond(message.id, {
				contentItems: [{ type: 'inputText', text: `pong_echo: ${text}` }],
				success: true,
			});
			return;
		}
		if (method === 'applyPatchApproval' || method === 'execCommandApproval') {
			this.respond(message.id, { decision: 'approved' });
			return;
		}
		if (method === 'mcpServer/elicitation/request') {
			this.respond(message.id, { action: 'decline', content: null, _meta: null });
			return;
		}
		this.respondError(message.id, -32601, `pong M0 PoC does not implement ${method}`);
	}

	handleApprovalRequest(message) {
		const params = message.params ?? {};
		const receivedAt = Date.now();
		const entry = {
			method: message.method,
			turnId: params.turnId,
			itemId: params.itemId,
			approvalId: params.approvalId ?? null,
			command: params.command ?? null,
			reason: params.reason ?? null,
			decision: 'accept',
			startedAtMs: params.startedAtMs ?? null,
			receivedAt: nowIso(),
			respondedAt: null,
			hostRoundtripMs: null,
			serverRoundtripMs: null,
			timeoutMs: APPROVAL_TIMEOUT_MS,
		};
		// M0 answers every approval immediately. The 120s decline path is covered
		// by the runtime package tests, not by this happy-path PoC.
		entry.respondedAt = nowIso();
		entry.hostRoundtripMs = Date.now() - receivedAt;
		entry.serverRoundtripMs =
			params.startedAtMs === undefined ? null : Date.now() - params.startedAtMs;
		this.recorder.recordApproval(entry);
		this.respond(message.id, { decision: 'accept' });
	}

	waitForTurnCompletion(turnId, timeoutMs) {
		const completed = this.completedTurns.get(turnId);
		if (completed) {
			this.completedTurns.delete(turnId);
			return Promise.resolve(completed);
		}
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.turnWaiters.delete(turnId);
				reject(new Error(`turn ${turnId} did not complete within ${timeoutMs} ms`));
			}, timeoutMs);
			this.turnWaiters.set(turnId, { turnId, resolve, reject, timer });
		});
	}

	request(method, params, timeoutMs = 60_000) {
		const id = this.nextId;
		this.nextId += 1;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(String(id));
				reject(new Error(`${method}: request timed out after ${timeoutMs} ms`));
			}, timeoutMs);
			this.pending.set(String(id), { method, resolve, reject, timer });
			this.send({ id, method, params });
		});
	}

	notify(method, params) {
		this.send(params === undefined ? { method } : { method, params });
	}

	respond(id, result) {
		this.send({ id, result });
	}

	respondError(id, code, message) {
		this.send({ id, error: { code, message } });
	}

	send(message) {
		this.recorder.record('out', message);
		this.outQueue.push(`${JSON.stringify(message)}\n`);
		this.flush();
	}

	flush() {
		if (this.writeBlocked || this.closed) return;
		while (this.outQueue.length > 0) {
			const line = this.outQueue.shift();
			if (!this.child.stdin.write(line)) {
				this.writeBlocked = true;
				this.child.stdin.once('drain', () => {
					this.writeBlocked = false;
					this.flush();
				});
				return;
			}
		}
	}

	rejectAll(error) {
		for (const [id, waiter] of this.pending) {
			clearTimeout(waiter.timer);
			waiter.reject(error);
			this.pending.delete(id);
		}
		for (const waiter of this.turnWaiters.values()) {
			clearTimeout(waiter.timer);
			waiter.reject(error);
		}
		this.turnWaiters.clear();
	}

	async shutdown() {
		const startedAt = Date.now();
		const steps = [];
		try {
			if (this.currentThreadId && this.lastTurnId) {
				try {
					await this.request(
						'turn/interrupt',
						{ threadId: this.currentThreadId, turnId: this.lastTurnId },
						5_000,
					);
					steps.push('interrupt-sent');
				} catch (error) {
					steps.push(`interrupt-failed: ${error instanceof Error ? error.message : String(error)}`);
				}
			}
			this.child.stdin.end();
			steps.push('stdin-closed');
			await waitForExit(this.child, 5_000);
			steps.push('exited');
		} catch {
			steps.push('kill-tree');
			await killTree(this.child.pid);
		}
		return { ms: Date.now() - startedAt, steps };
	}

	async closeArtifacts() {
		this.recorder.close();
		this.stderrStream.end();
	}
}

function extractEchoText(args) {
	if (args === null || typeof args !== 'object') return String(args);
	if (typeof args.text === 'string') return args.text;
	return JSON.stringify(args);
}

function waitForExit(child, timeoutMs) {
	return new Promise((resolve, reject) => {
		if (child.exitCode !== null || child.signalCode !== null) {
			resolve();
			return;
		}
		const timer = setTimeout(() => {
			child.off('exit', onExit);
			reject(new Error('process did not exit in time'));
		}, timeoutMs);
		const onExit = () => {
			clearTimeout(timer);
			resolve();
		};
		child.once('exit', onExit);
	});
}

function killTree(pid) {
	return new Promise((resolve) => {
		if (!pid) {
			resolve();
			return;
		}
		const child = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
		child.on('close', () => resolve());
		child.on('error', () => resolve());
	});
}

main().catch((error) => {
	console.error('[poc] fatal:', error);
	process.exitCode = 1;
});
