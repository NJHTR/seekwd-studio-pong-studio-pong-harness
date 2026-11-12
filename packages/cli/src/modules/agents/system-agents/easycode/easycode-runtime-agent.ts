import { Agent } from '@pong/agents';
import type {
	AgentMessage,
	AgentRunState,
	ExecutionOptions,
	GenerateResult,
	ResumeOptions,
	RunOptions,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	Workspace,
} from '@pong/agents';
import { isRecord } from '@pong/utils/is-record';
import { UnexpectedError } from '@pong/errors';
import { randomUUID } from 'node:crypto';

import {
	EASYCODE_AGENT_ID,
	EASYCODE_CLOSE_TIMEOUT_MS,
	EASYCODE_RUNTIME_KIND,
} from './easycode.constants';
import type { EasycodeNotification, EasycodeSupervisorPort } from './easycode-supervisor.port';

/** The inputs of one easyCode turn. */
export interface EasycodeRuntimeAgentOptions {
	/** The pong thread id. It is the process diagnostics id. */
	threadId: string;
	/** The project checkout that the app-server uses as `cwd`. */
	cwd: string;
	supervisor: EasycodeSupervisorPort;
	/** The easyCode thread of an earlier turn, when the pong thread already ran. */
	resumeThreadId?: string | null;
	model?: string;
	/** Only the capability facts of ADR-06. No persona, no fixed steps. */
	developerInstructions?: string;
}

export interface EasycodePrepareResult {
	easycodeThreadId: string;
	/** True when the thread was resumed, false when it was started. */
	resumed: boolean;
}

/** Map an easyCode terminal status to a pong finish reason. */
function toFinishReason(status: string): 'stop' | 'cancelled' | 'error' {
	if (status === 'interrupted') return 'cancelled';
	if (status === 'failed') return 'error';
	return 'stop';
}

function readField(source: unknown, key: string): unknown {
	return isRecord(source) ? source[key] : undefined;
}

function readString(source: unknown, key: string): string | undefined {
	const value = readField(source, key);
	return typeof value === 'string' ? value : undefined;
}

/** The text of a turn. The Agents runtime sends the stored message. */
function promptText(input: AgentMessage[] | string): string {
	if (typeof input === 'string') return input;
	throw new UnexpectedError('The easyCode runtime accepts a text prompt only.');
}

/** Wait for a promise, or give up after `timeoutMs`. */
async function settleWithin(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<void>((resolve) => {
		timer = setTimeout(resolve, timeoutMs);
		timer.unref();
	});
	try {
		await Promise.race([promise.then(() => undefined), timeout]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

/**
 * One easyCode turn as a pong `Agent`.
 *
 * The Agents runtime owns the queue, the execution record, the SSE channel and
 * the history. This agent only speaks the app-server protocol: it starts or
 * resumes one easyCode thread per pong thread, maps the stream notifications to
 * the minimal `StreamChunk` set of the chat timeline, and ends the child process
 * when the turn settles.
 */
export class EasycodeRuntimeAgent extends Agent {
	private readonly supervisor: EasycodeSupervisorPort;
	private readonly cwd: string;
	private readonly easycodeModel: string | undefined;
	private readonly developerInstructions: string | undefined;
	private resumeThreadId: string | null;
	private easycodeThreadId: string | null = null;
	private activeTurnId: string | null = null;
	private prepared = false;
	private status: AgentRunState = 'idle';
	private unsubscribe: (() => void) | null = null;

	constructor(options: EasycodeRuntimeAgentOptions) {
		super(EASYCODE_AGENT_ID);
		this.supervisor = options.supervisor;
		this.cwd = options.cwd;
		this.easycodeModel = options.model;
		this.developerInstructions = options.developerInstructions;
		this.resumeThreadId = options.resumeThreadId ?? null;
	}

	/** The runtime kind that the provider stores on the thread. */
	get runtimeKind(): string {
		return EASYCODE_RUNTIME_KIND;
	}

	/** The easyCode thread id, after `prepare()`. */
	get threadId(): string | null {
		return this.easycodeThreadId;
	}

	/**
	 * Start the app-server, then resume the thread of an earlier turn or start a
	 * new one. A resume needs a persisted rollout; the supervisor falls back to a
	 * new thread when the server rejects it (ADR-02 M0 finding).
	 */
	async prepare(): Promise<EasycodePrepareResult> {
		if (this.prepared && this.easycodeThreadId !== null) {
			return { easycodeThreadId: this.easycodeThreadId, resumed: this.resumeThreadId !== null };
		}
		await this.supervisor.start();
		if (this.resumeThreadId !== null) {
			try {
				const resumed = await this.supervisor.resumeThread({ threadId: this.resumeThreadId });
				this.easycodeThreadId = resumed.threadId;
				this.prepared = true;
				return { easycodeThreadId: resumed.threadId, resumed: true };
			} catch {
				// No rollout, or a stale rollout. Start a new thread.
				this.resumeThreadId = null;
			}
		}
		const started = await this.supervisor.startThread({
			cwd: this.cwd,
			...(this.easycodeModel !== undefined ? { model: this.easycodeModel } : {}),
			...(this.developerInstructions !== undefined
				? { developerInstructions: this.developerInstructions }
				: {}),
		});
		this.easycodeThreadId = started.threadId;
		this.prepared = true;
		return { easycodeThreadId: started.threadId, resumed: false };
	}

	override async stream(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<StreamResult> {
		const threadId = this.requireThreadId();
		const prompt = promptText(input);
		const runId = randomUUID();
		const { turnId } = await this.supervisor.startTurn(threadId, prompt, {
			cwd: this.cwd,
			...(this.easycodeModel !== undefined ? { model: this.easycodeModel } : {}),
		});
		this.activeTurnId = turnId;
		this.status = 'running';
		const stream = this.createChunkStream(turnId, options?.abortSignal);
		return { runId, stream, getState: () => this.getState() };
	}

	/** HITL resume is not part of M1-A: the approval bridge arrives in the next task. */
	async resume(
		method: 'generate',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult>;
	async resume(
		method: 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<StreamResult>;
	override async resume(
		method: 'generate' | 'stream',
		_data: unknown,
		_options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		throw new UnexpectedError(
			`The easyCode runtime does not support resume (${method}) before the approval bridge exists.`,
		);
	}

	override async generate(
		_input: AgentMessage[] | string,
		_options?: RunOptions & ExecutionOptions,
	): Promise<GenerateResult> {
		throw new UnexpectedError('The easyCode runtime streams only.');
	}

	override getWorkspace(): Workspace | undefined {
		return undefined;
	}

	getState(): SerializableAgentState {
		return {
			status: this.status,
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		};
	}

	/**
	 * End the current turn, then release the child process. An interrupt that
	 * takes longer than 5 seconds is treated as ended (ADR-02, M0 finding 1).
	 */
	override async close(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		const threadId = this.easycodeThreadId;
		const turnId = this.activeTurnId;
		if (threadId !== null && turnId !== null) {
			this.activeTurnId = null;
			await settleWithin(
				this.supervisor.interruptTurn(threadId, turnId, EASYCODE_CLOSE_TIMEOUT_MS),
				EASYCODE_CLOSE_TIMEOUT_MS,
			).catch(() => undefined);
		}
		if (this.status === 'running') this.status = 'cancelled';
		await settleWithin(this.supervisor.shutdown(), EASYCODE_CLOSE_TIMEOUT_MS).catch(
			() => undefined,
		);
		this.prepared = false;
	}

	private requireThreadId(): string {
		if (!this.prepared || this.easycodeThreadId === null) {
			throw new UnexpectedError('The easyCode runtime was not prepared before the turn.');
		}
		return this.easycodeThreadId;
	}

	private createChunkStream(
		turnId: string,
		abortSignal?: AbortSignal,
	): ReadableStream<StreamChunk> {
		return new ReadableStream<StreamChunk>({
			start: (controller) => {
				const textItems = new Set<string>();
				const reasoningItems = new Set<string>();
				let closed = false;
				let finishReason: 'stop' | 'cancelled' | 'error' = 'stop';

				const emit = (chunk: StreamChunk) => {
					if (closed) return;
					try {
						controller.enqueue(chunk);
					} catch {
						closed = true;
					}
				};
				const closeText = () => {
					for (const id of textItems) emit({ type: 'text-end', id });
					for (const id of reasoningItems) emit({ type: 'reasoning-end', id });
					textItems.clear();
					reasoningItems.clear();
				};
				const finish = (reason: 'stop' | 'cancelled' | 'error') => {
					if (closed) return;
					finishReason = reason;
					closeText();
					emit({ type: 'finish', finishReason: reason });
					cleanup();
					controller.close();
				};
				const cleanup = () => {
					closed = true;
					this.unsubscribe?.();
					this.unsubscribe = null;
					abortSignal?.removeEventListener('abort', onAbort);
					if (this.activeTurnId === turnId) {
						this.activeTurnId = null;
						this.status = this.toRunState(finishReason);
					}
				};
				const onAbort = () => {
					const threadId = this.easycodeThreadId;
					if (threadId !== null) {
						void this.supervisor
							.interruptTurn(threadId, turnId, EASYCODE_CLOSE_TIMEOUT_MS)
							.catch(() => undefined);
					}
					finish('cancelled');
				};
				if (abortSignal?.aborted === true) {
					finish('cancelled');
					return;
				}
				abortSignal?.addEventListener('abort', onAbort, { once: true });

				this.unsubscribe = this.supervisor.onNotification((notification) => {
					this.onNotification(notification, {
						emit,
						finish,
						textItems,
						reasoningItems,
						turnId,
					});
				});
			},
		});
	}

	private onNotification(
		notification: EasycodeNotification,
		sink: {
			emit: (chunk: StreamChunk) => void;
			finish: (reason: 'stop' | 'cancelled' | 'error') => void;
			textItems: Set<string>;
			reasoningItems: Set<string>;
			turnId: string;
		},
	): void {
		if (notification.method === 'error') {
			const params = notification.params;
			sink.emit({ type: 'error', error: new Error(readErrorMessage(params)) });
			return;
		}

		if (notification.method === 'turn/completed' || notification.method === 'turn/failed') {
			if (!this.belongsToRun(notification.params, sink.turnId)) return;
			sink.finish(toFinishReason(readTurnStatus(notification.params)));
			return;
		}

		if (notification.method === 'item/agentMessage/delta') {
			const params = notification.params;
			const itemId = readString(params, 'itemId') ?? randomUUID();
			const delta = readString(params, 'delta');
			if (delta === undefined) return;
			if (!sink.textItems.has(itemId)) {
				sink.textItems.add(itemId);
				sink.emit({ type: 'text-start', id: itemId });
			}
			sink.emit({ type: 'text-delta', id: itemId, delta });
			return;
		}

		if (
			notification.method === 'item/reasoning/textDelta' ||
			notification.method === 'item/reasoning/summaryTextDelta'
		) {
			const params = notification.params;
			const sourceId = readString(params, 'itemId') ?? randomUUID();
			const id = `reasoning:${sourceId}`;
			const delta = readString(params, 'delta');
			if (delta === undefined) return;
			if (!sink.reasoningItems.has(id)) {
				sink.reasoningItems.add(id);
				sink.emit({ type: 'reasoning-start', id });
			}
			sink.emit({ type: 'reasoning-delta', id, delta });
			return;
		}

		if (notification.method === 'item/completed') {
			const itemId = readString(readField(notification.params, 'item'), 'id');
			if (itemId !== undefined && sink.textItems.has(itemId)) {
				sink.textItems.delete(itemId);
				sink.emit({ type: 'text-end', id: itemId });
			}
			const reasoningId = itemId === undefined ? undefined : `reasoning:${itemId}`;
			if (reasoningId !== undefined && sink.reasoningItems.has(reasoningId)) {
				sink.reasoningItems.delete(reasoningId);
				sink.emit({ type: 'reasoning-end', id: reasoningId });
			}
		}
	}

	/** Only the completed turn of this stream may finish it. */
	private belongsToRun(params: unknown, turnId: string): boolean {
		const turn = readField(params, 'turn');
		const id = readString(turn, 'id');
		return id === undefined || id === turnId;
	}

	private toRunState(reason: 'stop' | 'cancelled' | 'error'): AgentRunState {
		if (reason === 'cancelled') return 'cancelled';
		if (reason === 'error') return 'failed';
		return 'success';
	}
}

function readTurnStatus(params: unknown): string {
	const turn = readField(params, 'turn');
	return readString(turn, 'status') ?? 'completed';
}

function readErrorMessage(params: unknown): string {
	const error = readField(params, 'error');
	return readString(error, 'message') ?? 'The easyCode app-server reported an error.';
}
