import { PassThrough } from 'node:stream';
import type { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { RequestTimeoutError, TransportClosedError } from '../src/errors';
import { BoundedQueue, JsonlTransport, LineDecoder, RemoteProtocolError } from '../src/transport';
import type { JsonlTransportOptions } from '../src/transport';

function parseAny(value: unknown): unknown {
	return value;
}

function createHarness(overrides: Partial<JsonlTransportOptions> = {}): {
	transport: JsonlTransport;
	input: PassThrough;
	written: string[];
} {
	const input = new PassThrough();
	const output = new PassThrough();
	const chunks: string[] = [];
	output.on('data', (chunk: Buffer) => {
		chunks.push(chunk.toString('utf8'));
	});
	const transport = new JsonlTransport({ input, output, ...overrides });
	return { transport, input, written: chunks };
}

async function flushIO(): Promise<void> {
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
}

describe('LineDecoder', () => {
	it('splits chunks at newlines and keeps the remainder', () => {
		const decoder = new LineDecoder();
		expect(decoder.push('{"id":1}\n{"id"')).toEqual(['{"id":1}']);
		expect(decoder.push(':2}\n')).toEqual(['{"id":2}']);
		expect(decoder.flush()).toEqual([]);
	});

	it('strips CRLF and flushes a trailing partial line', () => {
		const decoder = new LineDecoder();
		expect(decoder.push('a\r\nb\r')).toEqual(['a']);
		expect(decoder.flush()).toEqual(['b']);
	});
});

describe('BoundedQueue', () => {
	it('drops the oldest item when full and counts drops', () => {
		const queue = new BoundedQueue<number>(2);
		queue.push(1);
		queue.push(2);
		queue.push(3);
		expect(queue.size).toBe(2);
		expect(queue.dropped).toBe(1);
		expect(queue.shift()).toBe(2);
		expect(queue.shift()).toBe(3);
		expect(queue.shift()).toBeUndefined();
	});
});

describe('JsonlTransport', () => {
	it('correlates a response to its request id', async () => {
		const { transport, written } = createHarness();
		const pending = transport.request('initialize', { clientInfo: { name: 'test' } }, parseAny);
		expect(written.join('')).toContain('"method":"initialize"');
		transport.feed('{"id":1,"result":{"userAgent":"fake"}}\n');
		await expect(pending).resolves.toEqual({ userAgent: 'fake' });
		expect(transport.pendingRequestCount).toBe(0);
	});

	it('rejects with RemoteProtocolError when the server returns an error', async () => {
		const { transport } = createHarness();
		const pending = transport.request('turn/interrupt', {}, parseAny);
		const rejection = pending.catch((caught: unknown) => caught);
		transport.feed(
			'{"id":1,"error":{"code":-32600,"message":"invalid_request: no active turn"}}\n',
		);
		const error = await rejection;
		expect(error).toBeInstanceOf(RemoteProtocolError);
		if (error instanceof RemoteProtocolError) {
			expect(error.code).toBe(-32600);
			expect(error.message).toContain('no active turn');
		}
	});

	it('times out a request that never gets a response', async () => {
		const { transport } = createHarness({ defaultRequestTimeoutMs: 15 });
		await expect(transport.request('thread/start', {}, parseAny)).rejects.toBeInstanceOf(
			RequestTimeoutError,
		);
	});

	it('queues notifications with a bound and reports drops', () => {
		const { transport } = createHarness({ maxQueuedNotifications: 2 });
		transport.feed('{"method":"turn/started","params":{"n":1}}\n');
		transport.feed('{"method":"turn/started","params":{"n":2}}\n');
		transport.feed('{"method":"turn/started","params":{"n":3}}\n');
		expect(transport.notificationQueueSize).toBe(2);
		expect(transport.droppedNotifications).toBe(1);
		expect(transport.dequeueNotification()?.params).toEqual({ n: 2 });
	});

	it('does not await a server request listener before reading the next line', async () => {
		const { transport } = createHarness();
		const neverSettles = new Promise<void>(() => undefined);
		transport.onServerRequest(async () => {
			await neverSettles;
		});
		const pending = transport.request('thread/start', {}, parseAny);
		transport.feed('{"id":77,"method":"item/tool/call","params":{"tool":"x"}}\n');
		transport.feed('{"method":"item/completed","params":{"item":{"id":"i"}}}\n');
		transport.feed('{"id":1,"result":{"ok":true}}\n');
		await expect(pending).resolves.toEqual({ ok: true });
		expect(transport.notificationQueueSize).toBe(1);
	});

	it('answers a server request through respond and respondError', () => {
		const { transport, written } = createHarness();
		transport.onServerRequest((request) => {
			if (request.method === 'item/commandExecution/requestApproval') {
				transport.respond(request.id, { decision: 'accept' });
				return;
			}
			transport.respondError(request.id, -32601, 'unsupported');
		});
		transport.feed('{"id":42,"method":"item/commandExecution/requestApproval","params":{}}\n');
		transport.feed('{"id":43,"method":"item/tool/requestUserInput","params":{}}\n');
		expect(written.join('')).toContain('{"id":42,"result":{"decision":"accept"}}');
		expect(written.join('')).toContain('"code":-32601');
	});

	it('answers -32601 when no server request listener is registered', () => {
		const { transport, written } = createHarness();
		transport.feed('{"id":5,"method":"item/tool/call","params":{}}\n');
		expect(written.join('')).toContain('"id":5,"error":{"code":-32601');
	});

	it('reports protocol errors and keeps reading', async () => {
		const onProtocolError = vi.fn();
		const { transport } = createHarness({ onProtocolError });
		transport.feed('not json\n');
		transport.feed('{"not":"an envelope"}\n');
		expect(onProtocolError).toHaveBeenCalledTimes(2);
		const pending = transport.request('initialize', {}, parseAny);
		transport.feed('{"id":1,"result":{"ok":true}}\n');
		await expect(pending).resolves.toEqual({ ok: true });
		expect(transport.stats.protocolErrors).toBe(2);
	});

	it('handles CRLF lines and chunk boundaries', async () => {
		const { transport } = createHarness();
		const pending = transport.request('initialize', {}, parseAny);
		transport.feed('{"id":1,');
		transport.feed('"result":{"ok":true}}\r\n');
		await expect(pending).resolves.toEqual({ ok: true });
	});

	it('rejects pending requests when the input closes', async () => {
		const { transport, input } = createHarness();
		const pending = transport.request('initialize', {}, parseAny);
		// Attach the rejection handler before ending the stream: the close
		// rejects synchronously on the next tick.
		const rejection = pending.catch((caught: unknown) => caught);
		input.end();
		await flushIO();
		const error = await rejection;
		expect(error).toBeInstanceOf(TransportClosedError);
		expect(transport.isClosed).toBe(true);
	});

	it('keeps writes queued while the output reports backpressure', async () => {
		const drainHandlers: Array<() => void> = [];
		const chunks: string[] = [];
		let blocked = true;
		const output = {
			write(line: string): boolean {
				chunks.push(line);
				return !blocked;
			},
			once(event: string, onDrain: () => void): void {
				if (event === 'drain') drainHandlers.push(onDrain);
			},
			on(): void {
				// No-op: the transport only needs the error listener.
			},
		} as unknown as Writable;
		const input = new PassThrough();
		const transport = new JsonlTransport({ input, output });
		const first = transport.request('initialize', {}, parseAny);
		const second = transport.request('thread/start', {}, parseAny);
		// The first line left the queue and hit backpressure. The second waits.
		expect(transport.stats.outboundQueueDepth).toBe(1);
		expect(transport.stats.maxOutboundQueueDepth).toBe(1);
		expect(chunks).toHaveLength(1);
		blocked = false;
		for (const onDrain of drainHandlers) onDrain();
		expect(transport.stats.outboundQueueDepth).toBe(0);
		expect(chunks).toHaveLength(2);
		transport.feed('{"id":1,"result":{}}\n{"id":2,"result":{}}\n');
		await expect(first).resolves.toEqual({});
		await expect(second).resolves.toEqual({});
		expect(chunks.length).toBe(2);
	});

	it('tracks transport statistics', () => {
		const { transport } = createHarness();
		transport.feed('{"method":"warning","params":{}}\n');
		const stats = transport.stats;
		expect(stats.inboundMessages).toBe(1);
		expect(stats.notificationsQueued).toBe(1);
		expect(stats.lastInboundAtMs).not.toBeNull();
	});
});
