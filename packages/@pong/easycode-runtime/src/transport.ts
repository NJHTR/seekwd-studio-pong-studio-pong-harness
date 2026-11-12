/**
 * JSONL transport for the easyCode app-server stdio channel.
 *
 * Contract (ADR-02): the read loop never awaits. One stdout line is parsed and
 * dispatched synchronously, then the loop continues. Notifications go into a
 * bounded in-memory queue for a separate consumer. Server requests go to
 * listeners that must answer through `respond`/`respondError`.
 *
 * Outbound writes use a small queue with `drain` backpressure handling. The
 * read loop never waits for a write, because a full stdin pipe blocks the
 * server's only outbound route and can delay approvals.
 */

import type { Readable, Writable } from 'node:stream';
import { ProtocolError, RequestTimeoutError, TransportClosedError } from './errors';
import type {
	InboundMessage,
	InboundNotification,
	InboundRequest,
	JsonRpcErrorPayload,
	OutboundMessage,
	RequestId,
} from './protocol/envelopes';
import { parseInboundMessage } from './protocol/envelopes';

export type ResponseParser<T> = (value: unknown) => T;
export type NotificationListener = (notification: InboundNotification) => void | Promise<void>;
export type ServerRequestListener = (request: InboundRequest) => void | Promise<void>;
export type CloseListener = (reason: string) => void;
export type ProtocolErrorListener = (error: Error, line: string) => void;

export interface RequestOptions {
	timeoutMs?: number;
}

export interface JsonlTransportOptions {
	input: Readable;
	output: Writable;
	/** Bounded notification queue capacity. Default: 4096. */
	maxQueuedNotifications?: number;
	/** Default request timeout. Default: 60s. */
	defaultRequestTimeoutMs?: number;
	onProtocolError?: ProtocolErrorListener;
}

export interface TransportStats {
	inboundMessages: number;
	outboundMessages: number;
	notificationsQueued: number;
	notificationsDropped: number;
	pendingRequests: number;
	outboundQueueDepth: number;
	maxOutboundQueueDepth: number;
	protocolErrors: number;
	lastInboundAtMs: number | null;
}

const DEFAULT_MAX_QUEUED_NOTIFICATIONS = 4096;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

/** Bounded FIFO that drops the oldest entry when full. */
export class BoundedQueue<T> {
	private readonly items: T[] = [];
	private droppedCount = 0;

	constructor(private readonly capacity: number) {
		if (!Number.isInteger(capacity) || capacity <= 0) {
			throw new RangeError(`capacity must be a positive integer, got ${capacity}`);
		}
	}

	push(item: T): void {
		if (this.items.length >= this.capacity) {
			this.items.shift();
			this.droppedCount += 1;
		}
		this.items.push(item);
	}

	shift(): T | undefined {
		return this.items.shift();
	}

	clear(): void {
		this.items.length = 0;
	}

	get size(): number {
		return this.items.length;
	}

	get dropped(): number {
		return this.droppedCount;
	}

	get maxSize(): number {
		return this.capacity;
	}
}

/** Splits a byte stream into lines without awaiting. Handles CRLF. */
export class LineDecoder {
	private buffer = '';

	push(chunk: Buffer | string): string[] {
		this.buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
		const lines: string[] = [];
		let index = this.buffer.indexOf('\n');
		while (index >= 0) {
			const line = this.buffer.slice(0, index).replace(/\r$/u, '');
			lines.push(line);
			this.buffer = this.buffer.slice(index + 1);
			index = this.buffer.indexOf('\n');
		}
		return lines;
	}

	flush(): string[] {
		if (this.buffer.length === 0) return [];
		const line = this.buffer.replace(/\r$/u, '');
		this.buffer = '';
		return [line];
	}
}

interface PendingRequest {
	method: string;
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
}

export class RemoteProtocolError extends Error {
	readonly code: number;
	readonly data: unknown;

	constructor(method: string, payload: JsonRpcErrorPayload) {
		super(`${method}: ${payload.message}`);
		this.name = 'RemoteProtocolError';
		this.code = payload.code;
		this.data = payload.data;
	}
}

export class JsonlTransport {
	private readonly input: Readable;
	private readonly output: Writable;
	private readonly decoder = new LineDecoder();
	private readonly notificationQueue: BoundedQueue<InboundNotification>;
	private readonly pending = new Map<string, PendingRequest>();
	private readonly notificationListeners = new Set<NotificationListener>();
	private readonly requestListeners = new Set<ServerRequestListener>();
	private readonly closeListeners = new Set<CloseListener>();
	private readonly protocolErrorListeners = new Set<ProtocolErrorListener>();
	private readonly defaultRequestTimeoutMs: number;
	private outboundQueue: string[] = [];
	private writeBlocked = false;
	private nextRequestId = 1;
	private closed = false;
	private closedReason: string | null = null;
	private readonly counters = {
		inboundMessages: 0,
		outboundMessages: 0,
		protocolErrors: 0,
		maxOutboundQueueDepth: 0,
		lastInboundAtMs: null as number | null,
	};
	private readonly onChunk: (chunk: Buffer | string) => void;
	private readonly onInputEnd: () => void;

	constructor(options: JsonlTransportOptions) {
		this.input = options.input;
		this.output = options.output;
		this.notificationQueue = new BoundedQueue(
			options.maxQueuedNotifications ?? DEFAULT_MAX_QUEUED_NOTIFICATIONS,
		);
		this.defaultRequestTimeoutMs = options.defaultRequestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
		if (options.onProtocolError) this.protocolErrorListeners.add(options.onProtocolError);
		this.onChunk = (chunk) => {
			this.consumeLines(this.decoder.push(chunk));
		};
		this.onInputEnd = () => {
			this.consumeLines(this.decoder.flush());
			this.close('stdout closed');
		};
		this.input.on('data', this.onChunk);
		this.input.on('end', this.onInputEnd);
		this.input.on('error', (error: Error) => {
			this.close(`input error: ${error.message}`);
		});
		this.output.on('error', (error: Error) => {
			this.close(`output error: ${error.message}`);
		});
	}

	async request<T>(
		method: string,
		params: unknown,
		parse: ResponseParser<T>,
		options: RequestOptions = {},
	): Promise<T> {
		if (this.closed) {
			throw new TransportClosedError(this.closedReason ?? 'closed');
		}
		const id = this.nextRequestId;
		this.nextRequestId += 1;
		const timeoutMs = options.timeoutMs ?? this.defaultRequestTimeoutMs;
		return await new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(String(id));
				reject(new RequestTimeoutError(method, timeoutMs));
			}, timeoutMs);
			this.pending.set(String(id), {
				method,
				resolve: (value) => {
					try {
						resolve(parse(value));
					} catch (error) {
						reject(error instanceof Error ? error : new ProtocolError(String(error)));
					}
				},
				reject,
				timer,
			});
			this.send({ id, method, params });
		});
	}

	notify(method: string, params?: unknown): void {
		this.send(params === undefined ? { method } : { method, params });
	}

	respond(id: RequestId, result: unknown): void {
		this.send({ id, result });
	}

	respondError(id: RequestId, code: number, message: string, data?: unknown): void {
		this.send({ id, error: data === undefined ? { code, message } : { code, message, data } });
	}

	onNotification(listener: NotificationListener): () => void {
		this.notificationListeners.add(listener);
		return () => {
			this.notificationListeners.delete(listener);
		};
	}

	onServerRequest(listener: ServerRequestListener): () => void {
		this.requestListeners.add(listener);
		return () => {
			this.requestListeners.delete(listener);
		};
	}

	onClose(listener: CloseListener): () => void {
		this.closeListeners.add(listener);
		return () => {
			this.closeListeners.delete(listener);
		};
	}

	onProtocolError(listener: ProtocolErrorListener): () => void {
		this.protocolErrorListeners.add(listener);
		return () => {
			this.protocolErrorListeners.delete(listener);
		};
	}

	dequeueNotification(): InboundNotification | undefined {
		return this.notificationQueue.shift();
	}

	get notificationQueueSize(): number {
		return this.notificationQueue.size;
	}

	get droppedNotifications(): number {
		return this.notificationQueue.dropped;
	}

	get pendingRequestCount(): number {
		return this.pending.size;
	}

	get isClosed(): boolean {
		return this.closed;
	}

	get stats(): TransportStats {
		return {
			inboundMessages: this.counters.inboundMessages,
			outboundMessages: this.counters.outboundMessages,
			notificationsQueued: this.notificationQueue.size,
			notificationsDropped: this.notificationQueue.dropped,
			pendingRequests: this.pending.size,
			outboundQueueDepth: this.outboundQueue.length,
			maxOutboundQueueDepth: this.counters.maxOutboundQueueDepth,
			protocolErrors: this.counters.protocolErrors,
			lastInboundAtMs: this.counters.lastInboundAtMs,
		};
	}

	close(reason: string): void {
		if (this.closed) return;
		this.closed = true;
		this.closedReason = reason;
		this.input.off('data', this.onChunk);
		this.input.off('end', this.onInputEnd);
		for (const [id, waiter] of this.pending) {
			clearTimeout(waiter.timer);
			waiter.reject(new TransportClosedError(reason));
			this.pending.delete(id);
		}
		this.notificationQueue.clear();
		for (const listener of this.closeListeners) {
			try {
				listener(reason);
			} catch {
				// A close listener must not mask the close.
			}
		}
	}

	/** Test and embedding hook: feed bytes as if they came from stdout. */
	feed(chunk: Buffer | string): void {
		this.consumeLines(this.decoder.push(chunk));
	}

	private consumeLines(lines: string[]): void {
		for (const line of lines) this.handleLine(line);
	}

	private handleLine(line: string): void {
		if (line.trim() === '') return;
		this.counters.inboundMessages += 1;
		this.counters.lastInboundAtMs = Date.now();
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch (error) {
			this.reportProtocolError(
				error instanceof Error ? error : new ProtocolError(String(error)),
				line,
			);
			return;
		}
		const message = parseInboundMessage(parsed);
		if (message === null) {
			this.reportProtocolError(new ProtocolError('invalid wire envelope'), line);
			return;
		}
		this.dispatch(message);
	}

	private dispatch(message: InboundMessage): void {
		if (message.kind === 'response' || message.kind === 'error') {
			const waiter = this.pending.get(String(message.id));
			if (waiter === undefined) return;
			this.pending.delete(String(message.id));
			clearTimeout(waiter.timer);
			if (message.kind === 'response') waiter.resolve(message.result);
			else waiter.reject(new RemoteProtocolError(waiter.method, message.error));
			return;
		}
		if (message.kind === 'notification') {
			this.notificationQueue.push(message);
			for (const listener of this.notificationListeners) {
				this.invokeListener(listener, message);
			}
			return;
		}
		if (this.requestListeners.size === 0) {
			this.respondError(message.id, -32601, `no handler for ${message.method}`);
			return;
		}
		for (const listener of this.requestListeners) {
			this.invokeListener(listener, message);
		}
	}

	private invokeListener<T>(listener: (value: T) => void | Promise<void>, value: T): void {
		try {
			const result = listener(value);
			if (result !== undefined) {
				void Promise.resolve(result).catch((error: unknown) => {
					this.reportProtocolError(
						error instanceof Error ? error : new ProtocolError(String(error)),
						'listener rejection',
					);
				});
			}
		} catch (error) {
			this.reportProtocolError(
				error instanceof Error ? error : new ProtocolError(String(error)),
				'listener throw',
			);
		}
	}

	private reportProtocolError(error: Error, line: string): void {
		this.counters.protocolErrors += 1;
		for (const listener of this.protocolErrorListeners) {
			try {
				listener(error, line);
			} catch {
				// Keep the read loop alive.
			}
		}
	}

	private send(message: OutboundMessage): void {
		if (this.closed) return;
		this.counters.outboundMessages += 1;
		this.outboundQueue.push(`${JSON.stringify(message)}\n`);
		if (this.outboundQueue.length > this.counters.maxOutboundQueueDepth) {
			this.counters.maxOutboundQueueDepth = this.outboundQueue.length;
		}
		this.flush();
	}

	private flush(): void {
		if (this.writeBlocked || this.closed) return;
		while (this.outboundQueue.length > 0) {
			const line = this.outboundQueue.shift();
			if (line === undefined) return;
			if (!this.output.write(line)) {
				this.writeBlocked = true;
				this.output.once('drain', () => {
					this.writeBlocked = false;
					this.flush();
				});
				return;
			}
		}
	}
}
