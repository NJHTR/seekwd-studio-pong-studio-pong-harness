/**
 * The source of the fake easyCode app-server used by the runtime integration
 * test. The test spawns `node -e <source>`; a checked-in script would need its
 * own tsconfig/eslint project entry.
 *
 * It speaks the easyCode JSONL envelope: requests {id, method, params},
 * responses {id, result} | {id, error}, notifications {method, params}. One
 * turn streams two agent-message deltas and one reasoning delta, then completes.
 */
export const FAKE_APP_SERVER_SOURCE = String.raw`
import { createInterface } from 'node:readline';

const reader = createInterface({ input: process.stdin, crlfDelay: Infinity });
let activeTurn = null;
let nextTurnId = 1;

function send(message) {
	process.stdout.write(JSON.stringify(message) + '\n');
}

function sendResult(id, result) {
	send({ id, result });
}

function runTurn(threadId, requestId) {
	const turnId = 'turn-' + nextTurnId;
	nextTurnId += 1;
	activeTurn = { id: turnId, threadId };
	sendResult(requestId, {
		turn: { id: turnId, status: 'inProgress', items: [], error: null, durationMs: null },
	});
	setTimeout(() => {
		if (activeTurn === null) return;
		send({ method: 'turn/started', params: { threadId, turn: { id: turnId, status: 'inProgress' } } });
		send({
			method: 'item/reasoning/textDelta',
			params: { threadId, turnId, itemId: 'item-reasoning', delta: 'Thinking. ' },
		});
		send({
			method: 'item/agentMessage/delta',
			params: { threadId, turnId, itemId: 'item-text', delta: 'Hello ' },
		});
		send({
			method: 'item/agentMessage/delta',
			params: { threadId, turnId, itemId: 'item-text', delta: 'from the fake app-server.' },
		});
		send({
			method: 'item/completed',
			params: {
				threadId,
				turnId,
				item: { type: 'agentMessage', id: 'item-text', status: 'completed' },
			},
		});
		activeTurn = null;
		send({
			method: 'turn/completed',
			params: {
				threadId,
				turn: { id: turnId, status: 'completed', items: [], error: null, durationMs: 5 },
			},
		});
	}, 5);
}

reader.on('line', (line) => {
	if (line.trim() === '') return;
	let message;
	try {
		message = JSON.parse(line);
	} catch {
		return;
	}
	if (typeof message.method === 'string' && message.id !== undefined) handleRequest(message);
});

function handleRequest({ id, method, params }) {
	if (method === 'initialize') {
		sendResult(id, {
			userAgent: 'fake-easycode-app-server/0.0.0',
			easycodeHome: process.env.EASYCODE_HOME ?? 'C:/fake-easycode-home',
			platformFamily: 'windows',
			platformOs: 'windows',
		});
		return;
	}
	if (method === 'thread/start') {
		sendResult(id, {
			thread: { id: 'easycode-thread-1', status: { type: 'idle' } },
			model: 'fake-model',
			modelProvider: 'fake-provider',
			cwd: params?.cwd ?? process.cwd(),
			approvalPolicy: 'on-request',
		});
		return;
	}
	if (method === 'thread/resume') {
		sendResult(id, {
			thread: { id: params?.threadId ?? 'easycode-thread-1', status: { type: 'idle' } },
			model: 'fake-model',
			modelProvider: 'fake-provider',
		});
		return;
	}
	if (method === 'turn/start') {
		runTurn(params?.threadId ?? 'easycode-thread-1', id);
		return;
	}
	if (method === 'turn/interrupt') {
		if (activeTurn !== null) {
			const interrupted = activeTurn;
			activeTurn = null;
			sendResult(id, {});
			setTimeout(() => {
				send({
					method: 'turn/completed',
					params: {
						threadId: interrupted.threadId,
						turn: { id: interrupted.id, status: 'interrupted', items: [], error: null },
					},
				});
			}, 5);
			return;
		}
		send({ id, error: { code: -32600, message: 'invalid_request: no active turn' } });
		return;
	}
	send({ id, error: { code: -32601, message: 'unknown method ' + method } });
}

process.stdin.on('end', () => {
	process.exit(0);
});
`;
