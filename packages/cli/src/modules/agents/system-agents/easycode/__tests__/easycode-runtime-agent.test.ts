import type { StreamChunk } from '@pong/agents';

import { EasycodeRuntimeAgent, type EasycodeRuntimeAgentOptions } from '../easycode-runtime-agent';
import type {
	EasycodeInterruptResult,
	EasycodeNotification,
	EasycodeStartTurnParams,
	EasycodeSupervisorPort,
	EasycodeThreadStartParams,
} from '../easycode-supervisor.port';

class FakeSupervisor implements EasycodeSupervisorPort {
	readonly easycodeHome = 'C:/fake-easycode-home';

	started = false;

	shutDown = false;

	readonly threadStarts: EasycodeThreadStartParams[] = [];

	readonly resumes: string[] = [];

	readonly turns: Array<{ threadId: string; prompt: string; params: EasycodeStartTurnParams }> = [];

	readonly interrupts: Array<{ threadId: string; turnId: string; timeoutMs?: number }> = [];

	resumeFails = false;

	private readonly listeners = new Set<(notification: EasycodeNotification) => void>();

	async start(): Promise<void> {
		this.started = true;
	}

	async startThread(params: EasycodeThreadStartParams): Promise<{ threadId: string }> {
		this.threadStarts.push(params);
		return { threadId: 'easycode-thread-1' };
	}

	async resumeThread(params: { threadId: string }): Promise<{ threadId: string }> {
		this.resumes.push(params.threadId);
		if (this.resumeFails) throw new Error('no rollout found for thread id');
		return { threadId: params.threadId };
	}

	async startTurn(
		threadId: string,
		prompt: string,
		params: EasycodeStartTurnParams,
	): Promise<{ turnId: string }> {
		this.turns.push({ threadId, prompt, params });
		return { turnId: 'turn-1' };
	}

	async interruptTurn(
		threadId: string,
		turnId: string,
		timeoutMs?: number,
	): Promise<EasycodeInterruptResult> {
		this.interrupts.push({ threadId, turnId, timeoutMs });
		return { status: 'no-response' };
	}

	async shutdown(): Promise<void> {
		this.shutDown = true;
	}

	onNotification(listener: (notification: EasycodeNotification) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	get listenerCount(): number {
		return this.listeners.size;
	}

	emit(method: string, params?: unknown): void {
		for (const listener of [...this.listeners]) listener({ method, params });
	}
}

function createAgent(
	options: Omit<Partial<EasycodeRuntimeAgentOptions>, 'supervisor'> & {
		supervisor?: FakeSupervisor;
	} = {},
): { agent: EasycodeRuntimeAgent; supervisor: FakeSupervisor } {
	const supervisor = options.supervisor ?? new FakeSupervisor();
	const agent = new EasycodeRuntimeAgent({
		threadId: 'thread-1',
		cwd: 'C:/work/project',
		supervisor,
		...options,
	});
	return { agent, supervisor };
}

async function readChunks(stream: ReadableStream<StreamChunk>): Promise<StreamChunk[]> {
	const reader = stream.getReader();
	const chunks: StreamChunk[] = [];
	for (;;) {
		const next = await reader.read();
		if (next.done) return chunks;
		chunks.push(next.value);
	}
}

describe('EasycodeRuntimeAgent', () => {
	it('starts the app-server and a thread in the working directory on prepare', async () => {
		const { agent, supervisor } = createAgent();

		const prepared = await agent.prepare();

		expect(supervisor.started).toBe(true);
		expect(supervisor.threadStarts).toHaveLength(1);
		expect(supervisor.threadStarts[0]?.cwd).toBe('C:/work/project');
		expect(prepared).toEqual({ easycodeThreadId: 'easycode-thread-1', resumed: false });
		expect(agent.threadId).toBe('easycode-thread-1');
	});

	it('resumes the thread of the earlier turn', async () => {
		const { agent, supervisor } = createAgent({ resumeThreadId: 'easycode-thread-old' });

		const prepared = await agent.prepare();

		expect(supervisor.resumes).toEqual(['easycode-thread-old']);
		expect(supervisor.threadStarts).toHaveLength(0);
		expect(prepared).toEqual({ easycodeThreadId: 'easycode-thread-old', resumed: true });
	});

	it('starts a new thread when the rollout of the earlier thread is gone', async () => {
		const { agent, supervisor } = createAgent({ resumeThreadId: 'easycode-thread-old' });
		supervisor.resumeFails = true;

		const prepared = await agent.prepare();

		expect(supervisor.threadStarts).toHaveLength(1);
		expect(prepared.resumed).toBe(false);
	});

	it('maps the app-server notifications to the chat stream chunks', async () => {
		const { agent, supervisor } = createAgent();
		await agent.prepare();

		const run = await agent.stream('build a workflow');
		supervisor.emit('item/agentMessage/delta', { itemId: 'item-1', delta: 'Hello ' });
		supervisor.emit('item/agentMessage/delta', { itemId: 'item-1', delta: 'world' });
		supervisor.emit('item/reasoning/textDelta', { itemId: 'thinking', delta: 'Plan. ' });
		supervisor.emit('item/completed', { item: { id: 'item-1' } });
		supervisor.emit('turn/completed', { turn: { id: 'turn-1', status: 'completed' } });

		const chunks = await readChunks(run.stream);

		expect(supervisor.turns[0]).toMatchObject({
			threadId: 'easycode-thread-1',
			prompt: 'build a workflow',
		});
		expect(chunks).toEqual([
			{ type: 'text-start', id: 'item-1' },
			{ type: 'text-delta', id: 'item-1', delta: 'Hello ' },
			{ type: 'text-delta', id: 'item-1', delta: 'world' },
			{ type: 'reasoning-start', id: 'reasoning:thinking' },
			{ type: 'reasoning-delta', id: 'reasoning:thinking', delta: 'Plan. ' },
			{ type: 'text-end', id: 'item-1' },
			{ type: 'reasoning-end', id: 'reasoning:thinking' },
			{ type: 'finish', finishReason: 'stop' },
		]);
		expect(agent.getState().status).toBe('success');
	});

	it('finishes the stream as an error when the turn fails', async () => {
		const { agent, supervisor } = createAgent();
		await agent.prepare();
		const run = await agent.stream('do it');

		supervisor.emit('turn/completed', { turn: { id: 'turn-1', status: 'failed' } });
		const chunks = await readChunks(run.stream);

		expect(chunks).toEqual([{ type: 'finish', finishReason: 'error' }]);
		expect(agent.getState().status).toBe('failed');
	});

	it('reports a server error notification as an error chunk', async () => {
		const { agent, supervisor } = createAgent();
		await agent.prepare();
		const run = await agent.stream('do it');

		supervisor.emit('error', { error: { message: 'model overloaded' } });
		supervisor.emit('turn/completed', { turn: { id: 'turn-1', status: 'completed' } });
		const chunks = await readChunks(run.stream);

		expect(chunks[0]).toMatchObject({ type: 'error' });
		expect(chunks.at(-1)).toEqual({ type: 'finish', finishReason: 'stop' });
	});

	it('cancels an aborted turn and asks the server to interrupt it', async () => {
		const { agent, supervisor } = createAgent();
		await agent.prepare();
		const controller = new AbortController();
		const run = await agent.stream('do it', { abortSignal: controller.signal });

		controller.abort();
		const chunks = await readChunks(run.stream);

		expect(supervisor.interrupts).toEqual([
			{ threadId: 'easycode-thread-1', turnId: 'turn-1', timeoutMs: 5000 },
		]);
		expect(chunks).toEqual([{ type: 'finish', finishReason: 'cancelled' }]);
		expect(agent.getState().status).toBe('cancelled');
	});

	it('interrupts the active turn and releases the app-server on close', async () => {
		const { agent, supervisor } = createAgent();
		await agent.prepare();
		await agent.stream('do it');
		expect(supervisor.listenerCount).toBe(1);

		await agent.close();

		expect(supervisor.interrupts).toEqual([
			{ threadId: 'easycode-thread-1', turnId: 'turn-1', timeoutMs: 5000 },
		]);
		expect(supervisor.shutDown).toBe(true);
		expect(supervisor.listenerCount).toBe(0);
	});

	it('rejects a turn before prepare and an array prompt', async () => {
		const { agent } = createAgent();

		await expect(agent.stream('do it')).rejects.toThrow('was not prepared');

		await agent.prepare();
		await expect(agent.stream([])).rejects.toThrow('accepts a text prompt only');
	});
});
