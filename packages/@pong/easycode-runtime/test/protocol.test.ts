import { describe, expect, it } from 'vitest';
import { ProtocolError } from '../src/errors';
import { isRecord, parseInboundMessage } from '../src/protocol/envelopes';
import {
	CLIENT_METHODS,
	SERVER_NOTIFICATION_METHODS,
	SERVER_REQUEST_METHODS,
	WHITELISTED_METHODS,
} from '../src/protocol/methods';
import {
	isCommandExecutionApprovalParams,
	isDynamicToolCallParams,
	isTurnCompletedNotification,
	parseInitializeResponse,
	parseThreadStartResponse,
	parseTurn,
	parseTurnStartResponse,
} from '../src/protocol/parsers';

describe('wire envelopes', () => {
	it('classifies requests, notifications, responses, and errors', () => {
		expect(parseInboundMessage({ id: 7, method: 'thread/start', params: {} })).toEqual({
			kind: 'request',
			id: 7,
			method: 'thread/start',
			params: {},
		});
		expect(parseInboundMessage({ method: 'turn/completed', params: {} })).toEqual({
			kind: 'notification',
			method: 'turn/completed',
			params: {},
		});
		expect(parseInboundMessage({ id: 'abc', result: { ok: true } })).toEqual({
			kind: 'response',
			id: 'abc',
			result: { ok: true },
		});
		expect(
			parseInboundMessage({
				id: 1,
				error: { code: -32600, message: 'invalid_request: no active turn' },
			}),
		).toEqual({
			kind: 'error',
			id: 1,
			error: { code: -32600, message: 'invalid_request: no active turn' },
		});
	});

	it('rejects values that are not wire messages', () => {
		expect(parseInboundMessage(null)).toBeNull();
		expect(parseInboundMessage('text')).toBeNull();
		expect(parseInboundMessage({ foo: 'bar' })).toBeNull();
		expect(parseInboundMessage({ id: 1 })).toBeNull();
		expect(parseInboundMessage({ id: 1, error: { message: 'missing code' } })).toBeNull();
	});

	it('detects record values', () => {
		expect(isRecord({})).toBe(true);
		expect(isRecord([])).toBe(false);
		expect(isRecord(null)).toBe(false);
		expect(isRecord('x')).toBe(false);
	});
});

describe('method whitelist', () => {
	it('locks the wire method names that pong depends on', () => {
		expect(CLIENT_METHODS.initialize).toBe('initialize');
		expect(CLIENT_METHODS.threadStart).toBe('thread/start');
		expect(CLIENT_METHODS.threadResume).toBe('thread/resume');
		expect(CLIENT_METHODS.turnStart).toBe('turn/start');
		expect(CLIENT_METHODS.turnInterrupt).toBe('turn/interrupt');
		expect(SERVER_REQUEST_METHODS.commandExecutionApproval).toBe(
			'item/commandExecution/requestApproval',
		);
		expect(SERVER_REQUEST_METHODS.fileChangeApproval).toBe('item/fileChange/requestApproval');
		expect(SERVER_REQUEST_METHODS.dynamicToolCall).toBe('item/tool/call');
		expect(SERVER_NOTIFICATION_METHODS.turnCompleted).toBe('turn/completed');
		expect(SERVER_NOTIFICATION_METHODS.turnStarted).toBe('turn/started');
		expect(WHITELISTED_METHODS.client).toHaveLength(5);
		expect(WHITELISTED_METHODS.serverRequest).toHaveLength(10);
	});
});

describe('response parsers', () => {
	it('parses an initialize response', () => {
		expect(
			parseInitializeResponse({
				userAgent: 'easycode/0.0.0',
				easycodeHome: 'C:/home',
				platformFamily: 'windows',
				platformOs: 'windows',
			}),
		).toEqual({
			userAgent: 'easycode/0.0.0',
			easycodeHome: 'C:/home',
			platformFamily: 'windows',
			platformOs: 'windows',
		});
	});

	it('throws ProtocolError for an invalid initialize response', () => {
		expect(() => parseInitializeResponse({ userAgent: 1 })).toThrow(ProtocolError);
		expect(() => parseInitializeResponse(null)).toThrow(ProtocolError);
	});

	it('parses a thread/start response', () => {
		const response = parseThreadStartResponse({
			thread: { id: 'thread-1', status: { type: 'idle' } },
			model: 'fake-model',
			modelProvider: 'fake',
			cwd: 'C:/work',
			approvalPolicy: 'on-request',
		});
		expect(response.thread.id).toBe('thread-1');
		expect(response.thread.status).toEqual({ type: 'idle' });
		expect(response.model).toBe('fake-model');
	});

	it('parses turns and rejects unknown statuses', () => {
		const turn = parseTurn({
			id: 'turn-1',
			status: 'completed',
			durationMs: 12,
			items: [{ type: 'agentMessage', id: 'item-1', text: 'OK' }],
		});
		expect(turn.status).toBe('completed');
		expect(turn.items?.[0]?.text).toBe('OK');
		expect(() => parseTurn({ id: 'turn-1', status: 'weird' })).toThrow(ProtocolError);
	});

	it('parses a turn/start response', () => {
		expect(parseTurnStartResponse({ turn: { id: 'turn-9', status: 'inProgress' } })).toEqual({
			turn: { id: 'turn-9', status: 'inProgress' },
		});
	});
});

describe('payload guards', () => {
	it('accepts a command approval request payload', () => {
		expect(
			isCommandExecutionApprovalParams({
				threadId: 't',
				turnId: 'u',
				itemId: 'i',
				command: 'echo hi',
			}),
		).toBe(true);
		expect(isCommandExecutionApprovalParams({ threadId: 't' })).toBe(false);
	});

	it('accepts a dynamic tool call payload with JSON arguments', () => {
		expect(
			isDynamicToolCallParams({
				threadId: 't',
				turnId: 'u',
				callId: 'c',
				namespace: null,
				tool: 'pong_echo',
				arguments: { text: 'hi' },
			}),
		).toBe(true);
		expect(
			isDynamicToolCallParams({
				threadId: 't',
				turnId: 'u',
				callId: 'c',
				namespace: null,
				tool: 'pong_echo',
				arguments: () => undefined,
			}),
		).toBe(false);
	});

	it('accepts a turn/completed notification', () => {
		expect(
			isTurnCompletedNotification({ threadId: 't', turn: { id: 'turn-1', status: 'completed' } }),
		).toBe(true);
		expect(isTurnCompletedNotification({ threadId: 't' })).toBe(false);
	});
});
