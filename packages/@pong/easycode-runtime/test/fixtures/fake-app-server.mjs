#!/usr/bin/env node
// Fake easyCode app-server for pong runtime tests.
//
// It speaks the same JSONL envelope as the real binary:
// requests {id, method, params}, responses {id, result} | {id, error},
// notifications {method, params}, and server-to-client requests.
//
// Modes (FAKE_APP_SERVER_MODE):
//   normal               Full turn flow: approval request, dynamic tool call,
//                        then turn/completed. Default.
//   no-approval          Turn completes without a server request.
//   repeat-interrupt-silent
//                        turn/interrupt for an inactive turn sends no response.
//                        This emulates the real M0 finding.
//   slow-turn            A turn stays active until turn/interrupt arrives.
//   ignore-stdin-close   The process stays alive after stdin ends, to test the
//                        supervisor kill-tree fallback.
//   sqlite-init-fail     initialize fails with the real
//                        "failed to initialize sqlite state runtime" stderr for
//                        FAKE_SQLITE_FAIL_ATTEMPTS processes, then succeeds.
//   slow-handshake       initialize waits FAKE_SLOW_HANDSHAKE_MS and appends
//                        start/end lines to FAKE_HOME_MARKER_FILE.
//   exit-immediately     initialize prints an unrelated error and exits 1.
//   write-rollout        initialize writes a fake rollout JSONL under
//                        $EASYCODE_HOME/sessions, to model the M1 A/B leak.
//   crash-after-ready    initialize succeeds, then the process exits 1.
//
// FAKE_ECHO_HOME=1 returns EASYCODE_HOME in easycodeHome, to assert home
// isolation.

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

const mode = process.env.FAKE_APP_SERVER_MODE ?? 'normal';
const keepAlive = mode === 'ignore-stdin-close';

let nextServerRequestId = 100;
let nextTurnId = 1;
let activeTurn = null;
const completedTurns = new Set();
const responseWaiters = new Map();
const lineReader = createInterface({ input: process.stdin, crlfDelay: Infinity });

function send(message) {
	process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
	send({ id, result });
}

function sendError(id, code, message) {
	send({ id, error: { code, message } });
}

function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function waitForClientResponse(id) {
	return new Promise((resolve) => {
		responseWaiters.set(id, resolve);
	});
}

async function completeTurn(turnId, status) {
	activeTurn = null;
	completedTurns.add(turnId);
	send({
		method: 'turn/completed',
		params: {
			threadId: 'thread-1',
			turn: { id: turnId, status, items: [], error: null, durationMs: 5 },
		},
	});
}

async function runTurn(threadId, requestId) {
	const turnId = `turn-${nextTurnId}`;
	nextTurnId += 1;
	activeTurn = { id: turnId, threadId };
	sendResult(requestId, {
		turn: { id: turnId, status: 'inProgress', items: [], error: null, durationMs: null },
	});
	await delay(5);
	send({
		method: 'turn/started',
		params: { threadId, turn: { id: turnId, status: 'inProgress', items: [] } },
	});
	if (mode === 'slow-turn') {
		// Keep the turn active and leave one approval pending until the host
		// answers, interrupts, or shuts down.
		const approvalRequestId = nextServerRequestId;
		nextServerRequestId += 1;
		void waitForClientResponse(approvalRequestId);
		send({
			id: approvalRequestId,
			method: 'item/commandExecution/requestApproval',
			params: {
				threadId,
				turnId,
				itemId: 'item-slow',
				startedAtMs: Date.now(),
				command: 'echo slow-turn',
				reason: 'test approval',
			},
		});
		return;
	}
	if (mode === 'no-approval') {
		await completeTurn(turnId, 'completed');
		return;
	}
	const approvalRequestId = nextServerRequestId;
	nextServerRequestId += 1;
	const approvalResponse = waitForClientResponse(approvalRequestId);
	send({
		id: approvalRequestId,
		method: 'item/commandExecution/requestApproval',
		params: {
			threadId,
			turnId,
			itemId: 'item-1',
			startedAtMs: Date.now(),
			command: 'echo fake-approval',
			reason: 'test approval',
		},
	});
	const approval = await approvalResponse;
	if (approval?.decision === 'decline' || approval?.decision === 'cancel') {
		await completeTurn(turnId, 'interrupted');
		return;
	}
	const toolRequestId = nextServerRequestId;
	nextServerRequestId += 1;
	const toolResponse = waitForClientResponse(toolRequestId);
	send({
		id: toolRequestId,
		method: 'item/tool/call',
		params: {
			threadId,
			turnId,
			callId: 'call-1',
			namespace: null,
			tool: 'pong_echo',
			arguments: { text: 'fake-tool' },
		},
	});
	const toolResult = await toolResponse;
	send({
		method: 'item/completed',
		params: {
			threadId,
			turnId,
			item: { type: 'dynamicToolCall', id: 'call-1', status: 'completed' },
		},
	});
	if (toolResult?.success !== true) {
		await completeTurn(turnId, 'failed');
		return;
	}
	await completeTurn(turnId, 'completed');
}

function initializeResult() {
	const home =
		process.env.FAKE_ECHO_HOME === '1'
			? (process.env.EASYCODE_HOME ?? 'unset-home')
			: 'C:/fake-easycode-home';
	return {
		userAgent: 'fake-app-server/0.0.0',
		easycodeHome: home,
		platformFamily: 'windows',
		platformOs: 'windows',
	};
}

async function bumpCounter() {
	const counterFile = process.env.FAKE_COUNTER_FILE;
	if (counterFile === undefined) return 1;
	let count = 0;
	try {
		count = Number.parseInt(await readFile(counterFile, 'utf8'), 10);
	} catch {
		count = 0;
	}
	if (!Number.isFinite(count)) count = 0;
	const next = count + 1;
	await writeFile(counterFile, String(next), 'utf8');
	return next;
}

async function handleInitialize(id) {
	if (mode === 'sqlite-init-fail') {
		const attempt = await bumpCounter();
		const failAttempts = Number.parseInt(process.env.FAKE_SQLITE_FAIL_ATTEMPTS ?? '0', 10);
		if (Number.isFinite(failAttempts) && attempt <= failAttempts) {
			process.stderr.write(
				'Error: failed to initialize sqlite state runtime under C:/fake-home: failed to initialize state runtime at C:/fake-home\n',
			);
			process.exit(1);
		}
		sendResult(id, initializeResult());
		return;
	}
	if (mode === 'slow-handshake') {
		const markerFile = process.env.FAKE_HOME_MARKER_FILE;
		const serverId = process.env.FAKE_SERVER_ID ?? 'server';
		const delayMs = Number.parseInt(process.env.FAKE_SLOW_HANDSHAKE_MS ?? '150', 10);
		if (markerFile !== undefined) await appendFile(markerFile, `start ${serverId} ${Date.now()}\n`);
		await delay(Number.isFinite(delayMs) ? delayMs : 150);
		if (markerFile !== undefined) await appendFile(markerFile, `end ${serverId} ${Date.now()}\n`);
		sendResult(id, initializeResult());
		return;
	}
	if (mode === 'exit-immediately') {
		process.stderr.write('Error: unrelated configuration failure\n');
		process.exit(1);
	}
	if (mode === 'write-rollout') {
		const home = process.env.EASYCODE_HOME;
		if (home !== undefined && home !== '') {
			const sessions = path.join(home, 'sessions');
			await mkdir(sessions, { recursive: true });
			await writeFile(
				path.join(sessions, 'rollout-leak-probe.jsonl'),
				'{"type":"response_item","secret":"m1ab-changed-value"}\n',
				'utf8',
			);
		}
	}
	sendResult(id, initializeResult());
	if (mode === 'crash-after-ready') {
		setTimeout(() => {
			process.stderr.write('Error: simulated app-server crash\n');
			process.exit(1);
		}, 30);
	}
}

function handleClientRequest(message) {
	const { id, method, params } = message;
	if (method === 'initialize') {
		void handleInitialize(id);
		return;
	}
	if (method === 'thread/start') {
		sendResult(id, {
			thread: { id: 'thread-1', status: { type: 'idle' } },
			model: 'fake-model',
			modelProvider: 'fake-provider',
			cwd: params?.cwd ?? 'C:/fake-cwd',
			approvalPolicy: 'on-request',
		});
		return;
	}
	if (method === 'thread/resume') {
		sendResult(id, {
			thread: { id: params?.threadId ?? 'thread-1', status: { type: 'idle' } },
			model: 'fake-model',
			modelProvider: 'fake-provider',
		});
		return;
	}
	if (method === 'turn/start') {
		void runTurn(params?.threadId ?? 'thread-1', id);
		return;
	}
	if (method === 'turn/interrupt') {
		if (activeTurn !== null) {
			activeTurn = null;
			sendResult(id, {});
			void delay(10).then(() => {
				completedTurns.add(params?.turnId ?? 'unknown');
				send({
					method: 'turn/completed',
					params: {
						threadId: params?.threadId ?? 'thread-1',
						turn: {
							id: params?.turnId ?? 'unknown',
							status: 'interrupted',
							items: [],
							error: null,
							durationMs: 5,
						},
					},
				});
			});
			return;
		}
		if (mode === 'repeat-interrupt-silent') return;
		sendError(id, -32600, 'invalid_request: no active turn');
		return;
	}
	sendError(id, -32601, `unknown method ${method}`);
}

function handleClientResponse(message) {
	const waiter = responseWaiters.get(message.id);
	if (waiter === undefined) return;
	responseWaiters.delete(message.id);
	waiter(message.result);
}

lineReader.on('line', (line) => {
	if (line.trim() === '') return;
	let message;
	try {
		message = JSON.parse(line);
	} catch {
		return;
	}
	if (typeof message.method === 'string' && message.id !== undefined) {
		handleClientRequest(message);
		return;
	}
	if (typeof message.method === 'string') {
		return;
	}
	if (message.id !== undefined) handleClientResponse(message);
});

process.stdin.on('end', () => {
	if (keepAlive) {
		setInterval(() => undefined, 1000);
		return;
	}
	process.exit(0);
});

if (keepAlive) {
	// Also survive a closed stdout, as a hung child would.
	process.stdout.on('error', () => undefined);
}
