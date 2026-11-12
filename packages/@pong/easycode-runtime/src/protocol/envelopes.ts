/**
 * Wire envelope for the easyCode app-server stdio transport.
 *
 * easyCode calls this "JSON-RPC", but it does not send or expect the
 * `jsonrpc` field (see easyCode `app-server-protocol/src/rpc.rs`). The shapes
 * below match the Rust `JSONRPCRequest`, `JSONRPCNotification`,
 * `JSONRPCResponse`, and `JSONRPCError` structs.
 *
 * Source: easyCode `app-server-protocol/schema/typescript/{ClientRequest,ServerRequest,ServerNotification}.ts`.
 */

export type RequestId = string | number;

export interface JsonRpcErrorPayload {
	code: number;
	message: string;
	data?: unknown;
}

export interface InboundRequest {
	kind: 'request';
	id: RequestId;
	method: string;
	params?: unknown;
}

export interface InboundNotification {
	kind: 'notification';
	method: string;
	params?: unknown;
}

export interface InboundResponse {
	kind: 'response';
	id: RequestId;
	result: unknown;
}

export interface InboundError {
	kind: 'error';
	id: RequestId;
	error: JsonRpcErrorPayload;
}

export type InboundMessage = InboundRequest | InboundNotification | InboundResponse | InboundError;

export interface OutboundRequest {
	id: RequestId;
	method: string;
	params?: unknown;
}

export interface OutboundNotification {
	method: string;
	params?: unknown;
}

export interface OutboundResponse {
	id: RequestId;
	result: unknown;
}

export interface OutboundError {
	id: RequestId;
	error: JsonRpcErrorPayload;
}

export type OutboundMessage =
	| OutboundRequest
	| OutboundNotification
	| OutboundResponse
	| OutboundError;

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isRequestId(value: unknown): value is RequestId {
	return typeof value === 'string' || typeof value === 'number';
}

function isErrorPayload(value: unknown): value is JsonRpcErrorPayload {
	if (!isRecord(value)) return false;
	return typeof value.code === 'number' && typeof value.message === 'string';
}

/**
 * Parse one decoded JSON value into an inbound wire message.
 * Returns null when the value is not a valid envelope. The transport reports
 * that case and keeps reading.
 */
export function parseInboundMessage(value: unknown): InboundMessage | null {
	if (!isRecord(value)) return null;
	const method = value.method;
	const id = value.id;
	if (typeof method === 'string') {
		if (isRequestId(id)) return { kind: 'request', id, method, params: value.params };
		return { kind: 'notification', method, params: value.params };
	}
	if (!isRequestId(id)) return null;
	if ('error' in value) {
		if (!isErrorPayload(value.error)) return null;
		return { kind: 'error', id, error: value.error };
	}
	if ('result' in value) return { kind: 'response', id, result: value.result };
	return null;
}
