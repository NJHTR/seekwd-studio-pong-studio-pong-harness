#!/usr/bin/env node
// Fake easyCode app-server for the `--smoke` profiles of the M0 fault-injection
// and A/B baseline scripts. It speaks the same JSONL envelope as the real
// binary and is deterministic, so CI can run without easycode.exe or a model.
//
// Environment:
//   FAKE_MODE                 approval | no-approval | interrupt |
//                             silent-repeat-interrupt | resume-no-rollout
//                             Default: approval.
//   FAKE_APPROVAL_DELAY_MS    Delay before the approval request. Default: 0.
//   FAKE_TURN_MS              Turn duration for no-approval/interrupt modes.
//                             Default: 5.
//   FAKE_USAGE                "1" emits thread/tokenUsage/updated per turn.
//   FAKE_FINDINGS             Optional JSON file path. When set, the fake
//                             "producer" writes it and reports a handoff reply.

import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const mode = process.env.FAKE_MODE ?? 'approval';
const approvalDelayMs = Number(process.env.FAKE_APPROVAL_DELAY_MS ?? '0');
const turnMs = Number(process.env.FAKE_TURN_MS ?? '5');
const emitUsage = process.env.FAKE_USAGE === '1';
const findingsPath = process.env.FAKE_FINDINGS ?? null;
const findingsJson = process.env.FAKE_FINDINGS_JSON ?? null;
const answerJson = process.env.FAKE_ANSWER_JSON ?? null;

let nextRequestId = 100;
let nextTurnId = 1;
let threadCounter = 0;
let activeTurn = null;
const responseWaiters = new Map();
const pendingTimers = new Set();
const threadCwds = new Map();

const reader = createInterface({ input: process.stdin, crlfDelay: Infinity });

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
		const timer = setTimeout(() => {
			pendingTimers.delete(timer);
			resolve();
		}, ms);
		pendingTimers.add(timer);
	});
}

function waitForClientResponse(id) {
	return new Promise((resolve) => {
		responseWaiters.set(id, resolve);
	});
}

function emitTokenUsage(threadId, turnId, outputTokens) {
	if (!emitUsage) return;
	const totalTokens = 12_000 + outputTokens;
	const total = {
		totalTokens,
		inputTokens: 11_800,
		cachedInputTokens: 11_600,
		cacheWriteInputTokens: 0,
		outputTokens,
		reasoningOutputTokens: 0,
	};
	send({
		method: 'thread/tokenUsage/updated',
		params: {
			threadId,
			turnId,
			tokenUsage: { total, last: total, modelContextWindow: 258_400 },
			emittedAtMs: Date.now(),
		},
	});
}

async function completeTurn(threadId, turnId, status) {
	activeTurn = null;
	await writeFakeArtifacts(threadId);
	emitTokenUsage(threadId, turnId, 42);
	send({
		method: 'turn/completed',
		params: { threadId, turn: { id: turnId, status, items: [], error: null, durationMs: turnMs } },
	});
}

/** Smoke-only: let the fake "agent" write the JSON files a real agent writes. */
async function writeFakeArtifacts(threadId) {
	const cwd = threadCwds.get(threadId);
	if (cwd === undefined) return;
	try {
		if (findingsJson !== null)
			await writeFile(path.join(cwd, 'findings.json'), `${findingsJson}\n`, 'utf8');
		if (answerJson !== null)
			await writeFile(path.join(cwd, 'answer.json'), `${answerJson}\n`, 'utf8');
	} catch {
		// The workspace may not exist in a fault scenario; smoke does not care.
	}
}

async function runApprovalTurn(threadId, turnId) {
	send({
		method: 'turn/started',
		params: { threadId, turn: { id: turnId, status: 'inProgress', items: [] } },
	});
	await delay(approvalDelayMs);
	const requestId = nextRequestId;
	nextRequestId += 1;
	const approval = waitForClientResponse(requestId);
	send({
		id: requestId,
		method: 'item/commandExecution/requestApproval',
		params: {
			threadId,
			turnId,
			itemId: `item-${turnId}`,
			startedAtMs: Date.now(),
			command: 'echo fake-approval',
			reason: 'smoke approval',
		},
	});
	const response = await approval;
	const accepted = response?.decision === 'accept' || response?.decision === 'acceptForSession';
	send({
		method: 'item/completed',
		params: {
			threadId,
			turnId,
			item: {
				type: 'commandExecution',
				id: `item-${turnId}`,
				status: accepted ? 'completed' : 'declined',
				exitCode: accepted ? 0 : null,
				command: 'echo fake-approval',
			},
		},
	});
	await completeTurn(threadId, turnId, 'completed');
}

function startTurn(requestId, threadId) {
	const turnId = `turn-${nextTurnId}`;
	nextTurnId += 1;
	activeTurn = { id: turnId, threadId };
	send({
		id: requestId,
		result: {
			turn: { id: turnId, status: 'inProgress', items: [], error: null, durationMs: null },
		},
	});
	if (mode === 'approval') {
		void runApprovalTurn(threadId, turnId);
		return;
	}
	if (mode === 'resume-no-rollout' || mode === 'no-approval') {
		void (async () => {
			send({
				method: 'turn/started',
				params: { threadId, turn: { id: turnId, status: 'inProgress', items: [] } },
			});
			await delay(turnMs);
			if (mode === 'resume-no-rollout' && findingsPath !== null) {
				await writeFile(findingsPath, '{"fake":true}\n', 'utf8');
			}
			await completeTurn(threadId, turnId, 'completed');
		})();
		return;
	}
	if (mode === 'interrupt' || mode === 'silent-repeat-interrupt' || mode === 'slow-turn') {
		void (async () => {
			send({
				method: 'turn/started',
				params: { threadId, turn: { id: turnId, status: 'inProgress', items: [] } },
			});
			await delay(turnMs);
			if (activeTurn?.id === turnId) await completeTurn(threadId, turnId, 'completed');
		})();
		return;
	}
	void completeTurn(threadId, turnId, 'completed');
}

function handleClientRequest(message) {
	const { id, method, params } = message;
	if (method === 'initialize') {
		sendResult(id, {
			userAgent: 'fake-app-server/0.0.0',
			easycodeHome: 'C:/fake-easycode-home',
			platformFamily: 'windows',
			platformOs: 'windows',
		});
		return;
	}
	if (method === 'thread/start') {
		threadCounter += 1;
		const threadId = `thread-${threadCounter}`;
		if (typeof params?.cwd === 'string') threadCwds.set(threadId, params.cwd);
		sendResult(id, {
			thread: { id: threadId, status: { type: 'idle' } },
			model: 'fake-model',
			modelProvider: 'fake-provider',
			cwd: params?.cwd ?? 'C:/fake-cwd',
			approvalPolicy: params?.approvalPolicy ?? 'on-request',
		});
		return;
	}
	if (method === 'thread/resume') {
		if (mode === 'resume-no-rollout') {
			sendError(
				id,
				-32600,
				`no rollout found for thread id ${String(params?.threadId ?? 'thread-1')}`,
			);
			return;
		}
		sendResult(id, {
			thread: { id: params?.threadId ?? 'thread-1', status: { type: 'idle' } },
			model: 'fake-model',
			modelProvider: 'fake-provider',
		});
		return;
	}
	if (method === 'turn/start') {
		startTurn(id, params?.threadId ?? 'thread-1');
		return;
	}
	if (method === 'turn/interrupt') {
		if (activeTurn !== null) {
			const turnId = activeTurn.id;
			const threadId = activeTurn.threadId;
			activeTurn = null;
			sendResult(id, {});
			void delay(10).then(() => completeTurn(threadId, turnId, 'interrupted'));
			return;
		}
		if (mode === 'silent-repeat-interrupt' || mode === 'interrupt' || mode === 'slow-turn') return;
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

reader.on('line', (line) => {
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
	if (typeof message.method === 'string') return;
	if (message.id !== undefined) handleClientResponse(message);
});

process.stdin.on('end', () => {
	for (const timer of pendingTimers) clearTimeout(timer);
	process.exit(0);
});
