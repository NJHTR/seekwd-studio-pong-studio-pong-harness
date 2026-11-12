/** Errors raised by the easyCode protocol client and supervisor. */

export class ProtocolError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ProtocolError';
	}
}

export class RequestTimeoutError extends Error {
	readonly method: string;
	readonly timeoutMs: number;

	constructor(method: string, timeoutMs: number) {
		super(`${method}: request timed out after ${timeoutMs} ms`);
		this.name = 'RequestTimeoutError';
		this.method = method;
		this.timeoutMs = timeoutMs;
	}
}

export class TransportClosedError extends Error {
	constructor(reason: string) {
		super(`transport closed: ${reason}`);
		this.name = 'TransportClosedError';
	}
}

export class HandshakeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'HandshakeError';
	}
}
