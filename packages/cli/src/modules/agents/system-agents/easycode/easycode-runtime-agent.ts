import { Agent } from '@pong/agents';
import type {
	AgentMessage,
	AgentRunState,
	ExecutionOptions,
	FinishReason,
	GenerateResult,
	ResumeOptions,
	RunOptions,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	TokenUsage,
	Workspace,
} from '@pong/agents';
import { UnexpectedError, UserError } from '@pong/errors';
import { randomUUID } from 'node:crypto';

import type { SystemAgentHostEventEmitter } from '../system-agent-host-events';
import type { EasycodeApprovalBridge } from './approval-bridge';
import type { EasycodeArtifactBridge } from './artifact-bridge';
import type { EasycodeDynamicToolset } from './dynamic-tools';
import { EasycodeEventProjector } from './event-projection';
import {
	EASYCODE_AGENT_ID,
	EASYCODE_CLOSE_TIMEOUT_MS,
	EASYCODE_RUNTIME_KIND,
} from './easycode.constants';
import type { EasycodeNotification, EasycodeSupervisorPort } from './easycode-supervisor.port';
import {
	captureWorkspaceFingerprint,
	type EasycodeThreadStateStore,
	planResume,
} from './thread-state';

/** The inputs of one easyCode turn. */
export interface EasycodeRuntimeAgentOptions {
	/** The pong thread id. It is the process diagnostics id and the state key. */
	threadId: string;
	/** The project checkout that the app-server uses as `cwd`. */
	cwd: string;
	supervisor: EasycodeSupervisorPort;
	/** The easyCode thread of an earlier turn, from the pong thread binding. */
	resumeThreadId?: string | null;
	model?: string;
	/** Only the capability facts of ADR-06. No persona, no fixed steps. */
	developerInstructions?: string;
	/** The pong tools that the app-server may call. */
	toolset?: EasycodeDynamicToolset;
	/** Maps file changes of the turn to artifact manifests. */
	artifactBridge?: EasycodeArtifactBridge;
	/** The approval bridge of this turn, to answer decisions and cancel on interrupt. */
	approvalBridge?: EasycodeApprovalBridge;
	/** Remembers the easyCode thread next to the app-server home. */
	threadStateStore?: EasycodeThreadStateStore;
	/** Host events: thread fallback and other runtime notices. */
	emitHostEvent?: SystemAgentHostEventEmitter;
}

export interface EasycodePrepareResult {
	easycodeThreadId: string;
	/** True when the thread was resumed, false when it was started. */
	resumed: boolean;
}

/** A read side that a stream or a resume can subscribe to again. */
interface ChunkSource {
	subscribe(): ReadableStream<StreamChunk>;
	readonly isFinished: boolean;
}

/** One stream of chunks that a subscriber reads. A resume can subscribe again. */
class TurnRelay implements ChunkSource {
	private readonly buffer: StreamChunk[] = [];

	private readonly listeners = new Set<(chunk: StreamChunk) => void>();

	private finished = false;

	private closeSignal: (() => void) | null = null;

	constructor(private readonly maxBuffer = 500) {}

	push(chunk: StreamChunk): void {
		if (this.finished) return;
		this.buffer.push(chunk);
		if (this.buffer.length > this.maxBuffer) this.buffer.shift();
		for (const listener of this.listeners) listener(chunk);
	}

	finish(): void {
		this.finished = true;
		this.closeSignal?.();
	}

	get isFinished(): boolean {
		return this.finished;
	}

	subscribe(): ReadableStream<StreamChunk> {
		return new ReadableStream<StreamChunk>({
			start: (controller) => {
				for (const chunk of this.buffer) {
					try {
						controller.enqueue(chunk);
					} catch {
						// The caller closed the stream.
					}
				}
				const listener = (chunk: StreamChunk) => {
					try {
						controller.enqueue(chunk);
					} catch {
						this.listeners.delete(listener);
					}
				};
				this.listeners.add(listener);
				this.closeSignal = () => {
					this.listeners.delete(listener);
					try {
						controller.close();
					} catch {
						// Already closed.
					}
				};
				if (this.finished) this.finish();
			},
		});
	}
}

interface ResumeCommand {
	approvalId: string;
	decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel';
}

function parseResumeCommand(data: unknown): ResumeCommand | null {
	if (typeof data !== 'object' || data === null) return null;
	const approvalId = Reflect.get(data, 'approvalId');
	const decision = Reflect.get(data, 'decision');
	if (typeof approvalId !== 'string' || typeof decision !== 'string') return null;
	if (
		decision !== 'accept' &&
		decision !== 'acceptForSession' &&
		decision !== 'decline' &&
		decision !== 'cancel'
	) {
		return null;
	}
	return { approvalId, decision };
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
 * One easyCode conversation as a pong `Agent`.
 *
 * The Agents runtime owns the queue, the execution record, the SSE channel and
 * the history. This agent speaks the app-server protocol: it starts or resumes
 * one easyCode thread per pong thread, projects the stream to pong chunks,
 * records artifact manifests, and ends the child process when the turn settles.
 * Approvals are answered on the connection by the approval bridge; a HITL
 * resume only replays the pending decision and keeps reading the same turn.
 */
export class EasycodeRuntimeAgent extends Agent {
	private readonly pongThreadId: string;

	private readonly supervisor: EasycodeSupervisorPort;

	private readonly cwd: string;

	private readonly easycodeModel: string | undefined;

	private readonly developerInstructions: string | undefined;

	private readonly toolset: EasycodeDynamicToolset | undefined;

	private readonly artifactBridge: EasycodeArtifactBridge | undefined;

	private readonly approvalBridge: EasycodeApprovalBridge | undefined;

	private readonly threadStateStore: EasycodeThreadStateStore | undefined;

	private readonly emitHostEvent: SystemAgentHostEventEmitter | undefined;

	private readonly projector: EasycodeEventProjector;

	private readonly resumeThreadId: string | null;

	private easycodeThreadId: string | null = null;

	private activeTurnId: string | null = null;

	private activeRunId: string | null = null;

	private relay: TurnRelay | null = null;

	private prepared = false;

	private status: AgentRunState = 'idle';

	private unsubscribe: (() => void) | null = null;

	constructor(options: EasycodeRuntimeAgentOptions) {
		super(EASYCODE_AGENT_ID);
		this.pongThreadId = options.threadId;
		this.supervisor = options.supervisor;
		this.cwd = options.cwd;
		this.easycodeModel = options.model;
		this.developerInstructions = options.developerInstructions;
		this.toolset = options.toolset;
		this.artifactBridge = options.artifactBridge;
		this.approvalBridge = options.approvalBridge;
		this.threadStateStore = options.threadStateStore;
		this.emitHostEvent = options.emitHostEvent;
		this.resumeThreadId = options.resumeThreadId ?? null;
		this.projector = new EasycodeEventProjector({
			threadId: options.threadId,
			...(options.emitHostEvent !== undefined ? { emitHostEvent: options.emitHostEvent } : {}),
		});
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
	 * Start the app-server, then resume the thread of an earlier turn when the
	 * binding and the toolset still match, or start a new one. A resume that the
	 * server rejects, a changed cwd or a changed toolset start a new thread and
	 * emit `easycode-thread-forked`, so the chat says that the context moved.
	 */
	async prepare(): Promise<EasycodePrepareResult> {
		await this.supervisor.start();
		const toolsetHash = this.toolset?.hash() ?? 'none';
		const state =
			this.threadStateStore === undefined
				? null
				: await this.threadStateStore.read(this.pongThreadId);
		const knownThreadId = state?.easycodeThreadId ?? this.resumeThreadId;
		const resumePlan =
			state === null
				? ({ action: 'fork', reason: 'no-thread-state' } as const)
				: planResume(state, { cwd: this.cwd, toolsetHash });
		let forkReason: string | null = null;
		if (knownThreadId !== null) {
			// Without a state file the binding comes from the pong thread row. It
			// still names a thread, so try the resume and report a rejection.
			const canResume = resumePlan.action === 'resume' || state === null;
			if (canResume) {
				try {
					const resumed = await this.supervisor.resumeThread({ threadId: knownThreadId });
					this.easycodeThreadId = resumed.threadId;
					this.prepared = true;
					return { easycodeThreadId: resumed.threadId, resumed: true };
				} catch (error) {
					this.emitFork('resume-rejected', knownThreadId, error);
				}
			} else {
				this.emitFork(resumePlan.reason, knownThreadId);
				forkReason = resumePlan.reason;
			}
		}
		void forkReason;

		const started = await this.supervisor.startThread({
			cwd: this.cwd,
			...(this.easycodeModel !== undefined ? { model: this.easycodeModel } : {}),
			...(this.developerInstructions !== undefined
				? { developerInstructions: this.developerInstructions }
				: {}),
			...(this.toolset !== undefined ? { dynamicTools: this.toolset.specs() } : {}),
		});
		this.easycodeThreadId = started.threadId;
		this.prepared = true;
		await this.saveThreadState(toolsetHash);
		return { easycodeThreadId: started.threadId, resumed: false };
	}

	override async stream(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<StreamResult> {
		const threadId = this.requireThreadId();
		const prompt = promptText(input);
		const runId = randomUUID();
		const relay = new TurnRelay();
		this.relay = relay;
		this.activeRunId = runId;
		const stream = relay.subscribe();

		this.unsubscribe = this.supervisor.onNotification((notification) => {
			this.onNotification(notification, relay);
		});

		try {
			const { turnId } = await this.supervisor.startTurn(threadId, prompt, {
				cwd: this.cwd,
				...(this.easycodeModel !== undefined ? { model: this.easycodeModel } : {}),
			});
			this.activeTurnId = turnId;
			this.status = 'running';
			if (options?.abortSignal?.aborted === true) this.cancel(turnId, relay);
			else
				options?.abortSignal?.addEventListener('abort', () => this.cancel(turnId, relay), {
					once: true,
				});
			return { runId, stream, getState: () => this.getState() };
		} catch (error) {
			this.unsubscribe?.();
			this.unsubscribe = null;
			relay.push({ type: 'error', error });
			relay.push({ type: 'finish', finishReason: 'error' });
			relay.finish();
			throw error;
		}
	}

	/**
	 * Answer a pending approval and keep reading the same turn. The app-server
	 * blocks the turn on the request, so no new turn starts here.
	 */
	override async resume(
		method: 'generate',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult>;
	override async resume(
		method: 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<StreamResult>;
	override async resume(
		method: 'generate' | 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		const command = parseResumeCommand(data);
		if (command === null || this.approvalBridge === undefined) {
			throw new UserError('An easyCode resume needs an approval id and a decision.');
		}
		const resolved = this.approvalBridge.resolve(command.approvalId, command.decision);
		if (!resolved) {
			throw new UserError('The approval of this resume is no longer pending.');
		}
		await options.onResumeClaimed?.();
		const relay = this.relay;
		if (relay === null || relay.isFinished) {
			throw new UserError('The easyCode turn already ended.');
		}
		if (method === 'stream') {
			return {
				runId: options.runId || (this.activeRunId ?? randomUUID()),
				stream: relay.subscribe(),
				getState: () => this.getState(),
			};
		}
		return await this.collect(relay.subscribe(), options.runId || randomUUID());
	}

	override async generate(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<GenerateResult> {
		const result = await this.stream(input, options);
		return await this.collect(result.stream, result.runId);
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
	 * End the current turn, then release the child process. Pending approvals are
	 * cancelled first, so the server is not left waiting. An interrupt that takes
	 * longer than 5 seconds is treated as ended (ADR-02, M0 finding 1).
	 */
	override async close(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		const threadId = this.easycodeThreadId;
		const turnId = this.activeTurnId;
		if (turnId !== null) this.approvalBridge?.cancelTurn(turnId);
		if (threadId !== null && turnId !== null) {
			await settleWithin(
				this.supervisor.interruptTurn(threadId, turnId, EASYCODE_CLOSE_TIMEOUT_MS),
				EASYCODE_CLOSE_TIMEOUT_MS,
			).catch(() => undefined);
		}
		this.activeTurnId = null;
		this.relay?.finish();
		if (this.status === 'running') this.status = 'cancelled';
		await settleWithin(this.supervisor.shutdown(), EASYCODE_CLOSE_TIMEOUT_MS).catch(
			() => undefined,
		);
		this.prepared = false;
	}

	private onNotification(notification: EasycodeNotification, relay: TurnRelay): void {
		if (notification.method === 'turn/completed' || notification.method === 'turn/failed') {
			if (!this.belongsToRun(notification.params, this.activeTurnId)) return;
			const finishReason = toFinishReason(readTurnStatus(notification.params));
			for (const chunk of this.projector.closeOpenBlocks()) relay.push(chunk);
			relay.push({ type: 'finish', finishReason });
			relay.finish();
			this.status = this.toRunState(finishReason);
			this.activeTurnId = null;
			this.unsubscribe?.();
			this.unsubscribe = null;
			return;
		}
		this.artifactBridge?.observe(notification);
		for (const chunk of this.projector.project(notification)) relay.push(chunk);
	}

	private cancel(turnId: string, relay: TurnRelay): void {
		if (this.activeTurnId !== turnId) return;
		this.approvalBridge?.cancelTurn(turnId);
		const threadId = this.easycodeThreadId;
		if (threadId !== null) {
			void this.supervisor
				.interruptTurn(threadId, turnId, EASYCODE_CLOSE_TIMEOUT_MS)
				.catch(() => undefined);
		}
		for (const chunk of this.projector.closeOpenBlocks()) relay.push(chunk);
		relay.push({ type: 'finish', finishReason: 'cancelled' });
		relay.finish();
		this.status = 'cancelled';
		this.activeTurnId = null;
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	private async collect(
		stream: ReadableStream<StreamChunk>,
		runId: string,
	): Promise<GenerateResult> {
		const reader = stream.getReader();
		let finishReason: FinishReason | undefined;
		let usage: TokenUsage | undefined;
		for (;;) {
			const next = await reader.read();
			if (next.done) break;
			const chunk = next.value;
			if (chunk.type === 'usage') usage = chunk.usage;
			if (chunk.type === 'finish') finishReason = chunk.finishReason;
		}
		return {
			runId,
			messages: [],
			...(finishReason !== undefined ? { finishReason } : {}),
			...(usage !== undefined ? { usage } : {}),
			getState: () => this.getState(),
		};
	}

	private requireThreadId(): string {
		if (!this.prepared || this.easycodeThreadId === null) {
			throw new UnexpectedError('The easyCode runtime was not prepared before the turn.');
		}
		return this.easycodeThreadId;
	}

	private belongsToRun(params: unknown, turnId: string | null): boolean {
		const turn = readField(params, 'turn');
		const id = readString(turn, 'id');
		return id === undefined || turnId === null || id === turnId;
	}

	private emitFork(reason: string, previousThreadId: string, error?: unknown): void {
		this.emitHostEvent?.(
			'easycode-thread-forked',
			{
				reason,
				previousThreadId,
				message:
					error instanceof Error
						? error.message
						: 'The easyCode thread could not be resumed, so a new thread started.',
			},
			{ key: 'easycode-thread-forked' },
		);
	}

	private async saveThreadState(toolsetHash: string): Promise<void> {
		if (this.threadStateStore === undefined || this.easycodeThreadId === null) return;
		const fingerprint = await captureWorkspaceFingerprint(this.cwd);
		await this.threadStateStore
			.write(this.pongThreadId, {
				easycodeThreadId: this.easycodeThreadId,
				cwd: this.cwd,
				toolsetHash,
				gitHead: fingerprint.gitHead,
				gitDirty: fingerprint.gitDirty,
				updatedAt: new Date().toISOString(),
			})
			.catch(() => undefined);
	}

	private toRunState(reason: 'stop' | 'cancelled' | 'error'): AgentRunState {
		if (reason === 'cancelled') return 'cancelled';
		if (reason === 'error') return 'failed';
		return 'success';
	}
}

function promptText(input: AgentMessage[] | string): string {
	if (typeof input === 'string') return input;
	throw new UnexpectedError('The easyCode runtime accepts a text prompt only.');
}

function toFinishReason(status: string): 'stop' | 'cancelled' | 'error' {
	if (status === 'interrupted') return 'cancelled';
	if (status === 'failed') return 'error';
	return 'stop';
}

function readField(source: unknown, key: string): unknown {
	return typeof source === 'object' && source !== null ? Reflect.get(source, key) : undefined;
}

function readString(source: unknown, key: string): string | undefined {
	const value = readField(source, key);
	return typeof value === 'string' ? value : undefined;
}

function readTurnStatus(params: unknown): string {
	const turn = readField(params, 'turn');
	return readString(turn, 'status') ?? 'completed';
}
