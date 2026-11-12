/**
 * Runtime validation for wire payloads.
 *
 * The protocol has no generated runtime validators, and pong avoids type casts.
 * Every response and every consumed notification passes a parser or a type
 * guard here. A shape change fails with ProtocolError instead of a silent
 * property read on the wrong type.
 */

import { ProtocolError } from '../errors';
import type {
	CommandExecutionApprovalParams,
	FileChangeApprovalParams,
	LegacyApprovalParams,
	McpElicitationRequestParams,
	PermissionsApprovalParams,
	ToolRequestUserInputParams,
} from './approvals';
import type { DynamicToolCallParams, DynamicToolCallResponse } from './dynamic-tools';
import { isRecord } from './envelopes';
import type { InitializeResponse } from './initialize';
import type { JsonValue } from './json';
import type { Thread, ThreadResumeResponse, ThreadStartResponse } from './thread';
import type {
	AgentMessageDeltaNotification,
	ErrorNotification,
	ItemCompletedNotification,
	ItemStartedNotification,
	ThreadItemSummary,
	Turn,
	TurnCompletedNotification,
	TurnInterruptResponse,
	TurnStartResponse,
	TurnStartedNotification,
	TurnStatus,
} from './turn';

const TURN_STATUSES: readonly TurnStatus[] = ['completed', 'interrupted', 'failed', 'inProgress'];

function isTurnStatus(value: unknown): value is TurnStatus {
	return typeof value === 'string' && TURN_STATUSES.some((status) => status === value);
}

function requireRecord(value: unknown, context: string): Record<string, unknown> {
	if (!isRecord(value)) throw new ProtocolError(`${context}: expected an object`);
	return value;
}

function requireString(record: Record<string, unknown>, key: string, context: string): string {
	const value = record[key];
	if (typeof value !== 'string')
		throw new ProtocolError(`${context}: field "${key}" must be a string`);
	return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
	const value = record[key];
	return typeof value === 'string' ? value : undefined;
}

function optionalNumber(record: Record<string, unknown>, key: string): number | null | undefined {
	const value = record[key];
	if (typeof value === 'number') return value;
	if (value === null) return null;
	return undefined;
}

function optionalBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
	const value = record[key];
	return typeof value === 'boolean' ? value : undefined;
}

export function parseInitializeResponse(value: unknown): InitializeResponse {
	const record = requireRecord(value, 'initialize response');
	return {
		userAgent: requireString(record, 'userAgent', 'initialize response'),
		easycodeHome: requireString(record, 'easycodeHome', 'initialize response'),
		platformFamily: requireString(record, 'platformFamily', 'initialize response'),
		platformOs: requireString(record, 'platformOs', 'initialize response'),
	};
}

function parseThread(value: unknown): Thread {
	const record = requireRecord(value, 'thread');
	const thread: Thread = { id: requireString(record, 'id', 'thread') };
	const preview = optionalString(record, 'preview');
	if (preview !== undefined) thread.preview = preview;
	const sessionId = optionalString(record, 'sessionId');
	if (sessionId !== undefined) thread.sessionId = sessionId;
	const modelProvider = optionalString(record, 'modelProvider');
	if (modelProvider !== undefined) thread.modelProvider = modelProvider;
	const ephemeral = optionalBoolean(record, 'ephemeral');
	if (ephemeral !== undefined) thread.ephemeral = ephemeral;
	const status = record.status;
	if (isRecord(status) && typeof status.type === 'string') {
		thread.status = parseThreadStatus(status);
	}
	return thread;
}

function parseThreadStatus(record: Record<string, unknown>): Thread['status'] {
	const type = record.type;
	if (type === 'active') {
		const flags = Array.isArray(record.activeFlags)
			? record.activeFlags.filter((flag): flag is string => typeof flag === 'string')
			: [];
		return { type: 'active', activeFlags: flags };
	}
	if (type === 'notLoaded' || type === 'idle' || type === 'systemError') return { type };
	return undefined;
}

export function parseThreadStartResponse(value: unknown): ThreadStartResponse {
	const record = requireRecord(value, 'thread/start response');
	return {
		thread: parseThread(record.thread),
		model: requireString(record, 'model', 'thread/start response'),
		modelProvider: requireString(record, 'modelProvider', 'thread/start response'),
		cwd: requireString(record, 'cwd', 'thread/start response'),
		approvalPolicy: parseApprovalPolicy(record.approvalPolicy, 'thread/start response'),
	};
}

export function parseThreadResumeResponse(value: unknown): ThreadResumeResponse {
	const record = requireRecord(value, 'thread/resume response');
	const response: ThreadResumeResponse = {
		thread: parseThread(record.thread),
		model: requireString(record, 'model', 'thread/resume response'),
		modelProvider: requireString(record, 'modelProvider', 'thread/resume response'),
	};
	const cwd = optionalString(record, 'cwd');
	if (cwd !== undefined) response.cwd = cwd;
	return response;
}

function parseApprovalPolicy(
	value: unknown,
	context: string,
): ThreadStartResponse['approvalPolicy'] {
	if (typeof value === 'string') {
		if (value === 'untrusted' || value === 'on-request' || value === 'never') return value;
	}
	if (isRecord(value) && isRecord(value.granular)) {
		const granular: Record<string, boolean> = {};
		for (const [key, entry] of Object.entries(value.granular)) {
			if (typeof entry === 'boolean') granular[key] = entry;
		}
		return { granular };
	}
	throw new ProtocolError(`${context}: field "approvalPolicy" has an unknown shape`);
}

function parseThreadItemSummary(value: unknown): ThreadItemSummary {
	const record = requireRecord(value, 'thread item');
	const item: ThreadItemSummary = {
		type: requireString(record, 'type', 'thread item'),
		id: requireString(record, 'id', 'thread item'),
	};
	const text = optionalString(record, 'text');
	if (text !== undefined) item.text = text;
	const command = optionalString(record, 'command');
	if (command !== undefined) item.command = command;
	const status = optionalString(record, 'status');
	if (status !== undefined) item.status = status;
	const exitCode = optionalNumber(record, 'exitCode');
	if (exitCode !== undefined) item.exitCode = exitCode;
	const durationMs = optionalNumber(record, 'durationMs');
	if (durationMs !== undefined) item.durationMs = durationMs;
	return item;
}

export function parseTurn(value: unknown): Turn {
	const record = requireRecord(value, 'turn');
	const rawStatus = record.status;
	if (!isTurnStatus(rawStatus)) {
		throw new ProtocolError(`turn: unknown status "${String(rawStatus)}"`);
	}
	const turn: Turn = { id: requireString(record, 'id', 'turn'), status: rawStatus };
	const items = record.items;
	if (Array.isArray(items)) turn.items = items.map(parseThreadItemSummary);
	const error = record.error;
	if (isRecord(error) && typeof error.message === 'string') {
		turn.error = { message: error.message };
	} else if (error === null) {
		turn.error = null;
	}
	const durationMs = optionalNumber(record, 'durationMs');
	if (durationMs !== undefined) turn.durationMs = durationMs;
	return turn;
}

export function parseTurnStartResponse(value: unknown): TurnStartResponse {
	const record = requireRecord(value, 'turn/start response');
	return { turn: parseTurn(record.turn) };
}

export function parseTurnInterruptResponse(value: unknown): TurnInterruptResponse {
	requireRecord(value, 'turn/interrupt response');
	return {};
}

export function parseEmptyResponse(value: unknown): Record<string, never> {
	requireRecord(value, 'response');
	return {};
}

function isJsonValue(value: unknown, depth = 0): value is JsonValue {
	if (depth > 64) return false;
	if (value === null) return true;
	const type = typeof value;
	if (type === 'string' || type === 'boolean') return true;
	if (type === 'number') return Number.isFinite(value);
	if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry, depth + 1));
	if (isRecord(value)) return Object.values(value).every((entry) => isJsonValue(entry, depth + 1));
	return false;
}

export function isCommandExecutionApprovalParams(
	value: unknown,
): value is CommandExecutionApprovalParams {
	return (
		isRecord(value) &&
		typeof value.threadId === 'string' &&
		typeof value.turnId === 'string' &&
		typeof value.itemId === 'string'
	);
}

export function isFileChangeApprovalParams(value: unknown): value is FileChangeApprovalParams {
	return isCommandExecutionApprovalParams(value);
}

export function isPermissionsApprovalParams(value: unknown): value is PermissionsApprovalParams {
	return isCommandExecutionApprovalParams(value);
}

export function isToolRequestUserInputParams(value: unknown): value is ToolRequestUserInputParams {
	return isRecord(value) && Array.isArray(value.questions);
}

export function isMcpElicitationRequestParams(
	value: unknown,
): value is McpElicitationRequestParams {
	return isRecord(value) && typeof value.serverName === 'string';
}

export function isLegacyApprovalParams(value: unknown): value is LegacyApprovalParams {
	return isRecord(value) && typeof value.conversationId === 'string';
}

export function isDynamicToolCallParams(value: unknown): value is DynamicToolCallParams {
	return (
		isRecord(value) &&
		typeof value.threadId === 'string' &&
		typeof value.turnId === 'string' &&
		typeof value.callId === 'string' &&
		typeof value.tool === 'string' &&
		isJsonValue(value.arguments)
	);
}

export function isDynamicToolCallResponse(value: unknown): value is DynamicToolCallResponse {
	return (
		isRecord(value) &&
		typeof value.success === 'boolean' &&
		Array.isArray(value.contentItems) &&
		value.contentItems.every((item) => isRecord(item) && typeof item.type === 'string')
	);
}

export function isTurnStartedNotification(value: unknown): value is TurnStartedNotification {
	return isRecord(value) && typeof value.threadId === 'string' && isRecord(value.turn);
}

export function isTurnCompletedNotification(value: unknown): value is TurnCompletedNotification {
	return isTurnStartedNotification(value);
}

export function isItemStartedNotification(value: unknown): value is ItemStartedNotification {
	return (
		isRecord(value) &&
		typeof value.threadId === 'string' &&
		typeof value.turnId === 'string' &&
		isRecord(value.item)
	);
}

export function isItemCompletedNotification(value: unknown): value is ItemCompletedNotification {
	return isItemStartedNotification(value);
}

export function isAgentMessageDeltaNotification(
	value: unknown,
): value is AgentMessageDeltaNotification {
	return (
		isRecord(value) &&
		typeof value.threadId === 'string' &&
		typeof value.turnId === 'string' &&
		typeof value.delta === 'string'
	);
}

export function isErrorNotification(value: unknown): value is ErrorNotification {
	return (
		isRecord(value) &&
		typeof value.threadId === 'string' &&
		typeof value.turnId === 'string' &&
		isRecord(value.error) &&
		typeof value.error.message === 'string'
	);
}
