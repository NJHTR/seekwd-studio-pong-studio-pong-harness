/**
 * Process supervisor for `easycode app-server --listen stdio://`.
 *
 * The supervisor starts the child, performs the initialize handshake, routes
 * server requests to the approval broker and to host callbacks, and owns the
 * shutdown order from ADR-02:
 * interrupt -> wait for the terminal event -> close stdin -> wait -> kill tree.
 *
 * Windows Job Object support is an interface only in M0. The M1 Rust launcher
 * implements it; the fallback here is `taskkill /T /F`.
 */

import { execFile, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import path from 'node:path';
import { ApprovalBroker } from './approval';
import type { ApprovalDecision, ApprovalKind, PendingApprovalView } from './approval';
import { HandshakeError, ProtocolError, RequestTimeoutError, TransportClosedError } from './errors';
import type { DynamicToolCallParams, DynamicToolCallResponse } from './protocol/dynamic-tools';
import type { InboundNotification, InboundRequest } from './protocol/envelopes';
import { isRecord } from './protocol/envelopes';
import type { ClientInfo, InitializeParams, InitializeResponse } from './protocol/initialize';
import {
	CLIENT_METHODS,
	CLIENT_NOTIFICATION_METHODS,
	SERVER_REQUEST_METHODS,
} from './protocol/methods';
import {
	isCommandExecutionApprovalParams,
	isDynamicToolCallParams,
	isFileChangeApprovalParams,
	isLegacyApprovalParams,
	isMcpElicitationRequestParams,
	isPermissionsApprovalParams,
	isToolRequestUserInputParams,
	parseInitializeResponse,
	parseThreadResumeResponse,
	parseThreadStartResponse,
	parseTurnInterruptResponse,
	parseTurnStartResponse,
} from './protocol/parsers';
import type {
	ThreadResumeParams,
	ThreadResumeResponse,
	ThreadStartParams,
	ThreadStartResponse,
} from './protocol/thread';
import type {
	SandboxPolicy,
	TurnInterruptParams,
	TurnInterruptResponse,
	TurnStartParams,
	TurnStartResponse,
} from './protocol/turn';
import { JsonlTransport } from './transport';
import type { ResponseParser, TransportStats } from './transport';

export type SupervisorState = 'stopped' | 'starting' | 'ready' | 'closing' | 'closed';

/** Windows Job Object contract. The M1 Rust launcher implements this. */
export interface JobObject {
	readonly name: string;
	/** Assign a process to the job. Closing the job kills the tree. */
	assign(pid: number): Promise<void>;
	close(): Promise<void>;
}

export interface SupervisorLogger {
	debug(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

export interface ApprovalHostRequest extends PendingApprovalView {
	command: string | null;
	reason: string | null;
}

export interface SupervisorEvents {
	onNotification?: (notification: InboundNotification) => void;
	/**
	 * Approval callback. Return a decision to answer immediately. Return
	 * undefined to decide later through `supervisor.approvals.decide`.
	 */
	onApprovalRequest?: (
		request: ApprovalHostRequest,
	) => ApprovalDecision | Promise<ApprovalDecision> | undefined;
	onDynamicToolCall?: (
		call: DynamicToolCallParams,
	) => DynamicToolCallResponse | Promise<DynamicToolCallResponse>;
	onExit?: (info: { code: number | null; signal: NodeJS.Signals | null; reason: string }) => void;
}

export interface SupervisorOptions {
	exePath: string;
	appServerArgs?: string[];
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	clientInfo?: ClientInfo;
	events?: SupervisorEvents;
	jobObject?: JobObject;
	/** Default request timeout. Default: 60s. */
	requestTimeoutMs?: number;
	/** Approval deadline. Default: 120s. */
	approvalTimeoutMs?: number;
	/** Wait for exit after stdin close. Default: 5000 ms. */
	shutdownGraceMs?: number;
	/** Interrupt wait during shutdown. Default: 5000 ms. */
	shutdownInterruptTimeoutMs?: number;
	logger?: SupervisorLogger;
}

export interface HealthReport {
	ok: boolean;
	state: SupervisorState;
	pid: number | null;
	uptimeMs: number;
	childExited: boolean;
	transport: TransportStats;
	pendingApprovals: number;
}

export type InterruptStatus = 'interrupted' | 'no-active-turn' | 'no-response';

export interface InterruptOutcome {
	status: InterruptStatus;
	durationMs: number;
	detail: string | null;
}

export interface ShutdownResult {
	steps: string[];
	durationMs: number;
	forcedKill: boolean;
}

export interface StartTurnOptions {
	approvalPolicy?: string;
	sandboxPolicy?: SandboxPolicy;
	model?: string;
	cwd?: string;
}

const DEFAULT_APP_SERVER_ARGS = ['app-server', '--listen', 'stdio://'];
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_APPROVAL_TIMEOUT_MS = 120_000;
const DEFAULT_SHUTDOWN_GRACE_MS = 5_000;
const DEFAULT_SHUTDOWN_INTERRUPT_TIMEOUT_MS = 5_000;
const KILL_TIMEOUT_MS = 5_000;
const NO_ACTIVE_TURN_CODE = -32600;

const NOOP_LOGGER: SupervisorLogger = {
	debug: () => undefined,
	warn: () => undefined,
	error: () => undefined,
};

interface TurnWaiter {
	resolve: (turn: InboundNotification) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
}

export class AppServerSupervisor {
	readonly approvals: ApprovalBroker;

	private readonly options: SupervisorOptions;
	private readonly events: SupervisorEvents;
	private readonly logger: SupervisorLogger;
	private readonly requestTimeoutMs: number;
	private readonly shutdownGraceMs: number;
	private readonly shutdownInterruptTimeoutMs: number;
	private child: ChildProcess | null = null;
	private transport: JsonlTransport | null = null;
	private jobObject: JobObject | null;
	private stateValue: SupervisorState = 'stopped';
	private startedAtMs: number | null = null;
	private handshake: InitializeResponse | null = null;
	private threadId: string | null = null;
	private activeTurnId: string | null = null;
	private readonly completedTurnIds = new Set<string>();
	private readonly completedTurnNotifications = new Map<string, InboundNotification>();
	private turnWaiters = new Map<string, TurnWaiter>();
	private readonly notificationListeners = new Set<(notification: InboundNotification) => void>();

	constructor(options: SupervisorOptions) {
		this.options = options;
		this.events = options.events ?? {};
		this.logger = options.logger ?? NOOP_LOGGER;
		this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
		this.shutdownGraceMs = options.shutdownGraceMs ?? DEFAULT_SHUTDOWN_GRACE_MS;
		this.shutdownInterruptTimeoutMs =
			options.shutdownInterruptTimeoutMs ?? DEFAULT_SHUTDOWN_INTERRUPT_TIMEOUT_MS;
		this.jobObject = options.jobObject ?? null;
		this.approvals = new ApprovalBroker({
			defaultTimeoutMs: options.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS,
			onTimeout: (approval) => {
				this.logger.warn(`approval ${approval.approvalId} timed out; declined`);
			},
		});
	}

	get state(): SupervisorState {
		return this.stateValue;
	}

	get pid(): number | null {
		return this.child?.pid ?? null;
	}

	get currentThreadId(): string | null {
		return this.threadId;
	}

	get currentTurnId(): string | null {
		return this.activeTurnId;
	}

	get initializeResult(): InitializeResponse | null {
		return this.handshake;
	}

	async start(): Promise<InitializeResponse> {
		if (this.stateValue !== 'stopped')
			throw new Error(`cannot start supervisor in state ${this.stateValue}`);
		this.stateValue = 'starting';
		this.startedAtMs = Date.now();
		const args = this.options.appServerArgs ?? DEFAULT_APP_SERVER_ARGS;
		const child = spawn(this.options.exePath, args, {
			cwd: this.options.cwd,
			env: this.options.env ?? process.env,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
		});
		this.child = child;
		if (child.stdin === null || child.stdout === null || child.stderr === null) {
			throw new ProtocolError('child stdio streams are unavailable');
		}
		if (this.jobObject !== null && child.pid !== undefined) {
			try {
				await this.jobObject.assign(child.pid);
			} catch (error) {
				this.logger.warn(
					`job object assign failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
		const transport = new JsonlTransport({
			input: child.stdout,
			output: child.stdin,
			defaultRequestTimeoutMs: this.requestTimeoutMs,
			onProtocolError: (error, line) => {
				this.logger.error(`protocol error: ${error.message}; line=${line.slice(0, 200)}`);
			},
		});
		this.transport = transport;
		transport.onNotification((notification) => {
			this.handleNotification(notification);
		});
		transport.onServerRequest((request) => {
			void this.handleServerRequest(request);
		});
		child.on('exit', (code, signal) => {
			this.onChildExit({ code, signal, reason: 'process exit' });
		});
		child.on('error', (error) => {
			this.logger.error(`child error: ${error.message}`);
		});
		child.stderr.on('data', (chunk: Buffer) => {
			this.logger.debug(`stderr: ${chunk.toString('utf8').trimEnd()}`);
		});

		try {
			const capabilities: InitializeParams['capabilities'] = {
				experimentalApi: true,
				requestAttestation: false,
			};
			const clientInfo: ClientInfo = this.options.clientInfo ?? {
				name: 'pong-easycode-runtime',
				title: 'pong easyCode runtime',
				version: '0.1.0',
			};
			const response = await transport.request(
				CLIENT_METHODS.initialize,
				{ clientInfo, capabilities } satisfies InitializeParams,
				parseInitializeResponse,
				{ timeoutMs: this.requestTimeoutMs },
			);
			transport.notify(CLIENT_NOTIFICATION_METHODS.initialized);
			this.handshake = response;
			this.stateValue = 'ready';
			return response;
		} catch (error) {
			this.stateValue = 'closing';
			await this.shutdown();
			throw error instanceof Error ? error : new HandshakeError(String(error));
		}
	}

	async startThread(params: ThreadStartParams): Promise<ThreadStartResponse> {
		const transport = this.requireTransport();
		const response = await transport.request(
			CLIENT_METHODS.threadStart,
			params,
			parseThreadStartResponse,
			{
				timeoutMs: this.requestTimeoutMs,
			},
		);
		this.threadId = response.thread.id;
		this.logger.debug(`thread started: ${response.thread.id}`);
		return response;
	}

	async resumeThread(params: ThreadResumeParams): Promise<ThreadResumeResponse> {
		const transport = this.requireTransport();
		const response = await transport.request(
			CLIENT_METHODS.threadResume,
			params,
			parseThreadResumeResponse,
			{
				timeoutMs: this.requestTimeoutMs,
			},
		);
		this.threadId = response.thread.id;
		return response;
	}

	async startTurn(
		threadId: string,
		prompt: string,
		options: StartTurnOptions = {},
	): Promise<TurnStartResponse> {
		const transport = this.requireTransport();
		const params: TurnStartParams = {
			threadId,
			input: [{ type: 'text', text: prompt, text_elements: [] }],
		};
		if (options.approvalPolicy !== undefined) params.approvalPolicy = options.approvalPolicy;
		if (options.sandboxPolicy !== undefined) params.sandboxPolicy = options.sandboxPolicy;
		if (options.model !== undefined) params.model = options.model;
		if (options.cwd !== undefined) params.cwd = options.cwd;
		const response = await transport.request(
			CLIENT_METHODS.turnStart,
			params,
			parseTurnStartResponse,
			{
				timeoutMs: this.requestTimeoutMs,
			},
		);
		this.threadId = threadId;
		this.activeTurnId = response.turn.id;
		return response;
	}

	/**
	 * Wait for `turn/completed` for one turn. The caller usually starts the
	 * turn first, then awaits completion while the read loop keeps running.
	 */
	async waitForTurnCompleted(turnId: string, timeoutMs: number): Promise<InboundNotification> {
		const completed = this.completedTurnNotifications.get(turnId);
		if (completed !== undefined) {
			this.completedTurnNotifications.delete(turnId);
			return completed;
		}
		return await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.turnWaiters.delete(turnId);
				reject(new RequestTimeoutError('turn/completed', timeoutMs));
			}, timeoutMs);
			this.turnWaiters.set(turnId, { resolve, reject, timer });
		});
	}

	/**
	 * Send `turn/interrupt`. A remote `invalid_request("no active turn")` means
	 * the turn already ended. A missing response also means the host must treat
	 * the turn as ended and must not rebuild the process.
	 */
	async interruptTurn(
		threadId: string,
		turnId: string,
		timeoutMs?: number,
	): Promise<InterruptOutcome> {
		const transport = this.requireTransport();
		const startedAt = Date.now();
		try {
			const response = await transport.request<TurnInterruptResponse>(
				CLIENT_METHODS.turnInterrupt,
				{ threadId, turnId } satisfies TurnInterruptParams,
				parseTurnInterruptResponse,
				{ timeoutMs: timeoutMs ?? this.shutdownInterruptTimeoutMs },
			);
			this.clearTurn(turnId);
			return {
				status: 'interrupted',
				durationMs: Date.now() - startedAt,
				detail: JSON.stringify(response),
			};
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			if (error instanceof RequestTimeoutError) {
				// M0 observation: this dev build did not answer a repeat interrupt.
				// Treat a missing response as ended, per ADR-02 fallback.
				this.clearTurn(turnId);
				return { status: 'no-response', durationMs: Date.now() - startedAt, detail };
			}
			if (isNoActiveTurnError(error)) {
				this.clearTurn(turnId);
				return { status: 'no-active-turn', durationMs: Date.now() - startedAt, detail };
			}
			return {
				status: 'interrupted',
				durationMs: Date.now() - startedAt,
				detail: `degraded: ${detail}`,
			};
		}
	}

	healthCheck(): HealthReport {
		const childExited = this.child?.exitCode !== null && this.child?.exitCode !== undefined;
		const transport = this.transport;
		return {
			ok: this.stateValue === 'ready' && !childExited,
			state: this.stateValue,
			pid: this.pid,
			uptimeMs: this.startedAtMs === null ? 0 : Date.now() - this.startedAtMs,
			childExited,
			transport: transport?.stats ?? {
				inboundMessages: 0,
				outboundMessages: 0,
				notificationsQueued: 0,
				notificationsDropped: 0,
				pendingRequests: 0,
				outboundQueueDepth: 0,
				maxOutboundQueueDepth: 0,
				protocolErrors: 0,
				lastInboundAtMs: null,
			},
			pendingApprovals: this.approvals.pendingCount,
		};
	}

	onNotification(listener: (notification: InboundNotification) => void): () => void {
		this.notificationListeners.add(listener);
		return () => {
			this.notificationListeners.delete(listener);
		};
	}

	async shutdown(): Promise<ShutdownResult> {
		const startedAt = Date.now();
		const steps: string[] = [];
		let forcedKill = false;
		if (this.stateValue === 'closed')
			return { steps: ['already-closed'], durationMs: 0, forcedKill };
		this.stateValue = 'closing';
		const child = this.child;
		const transport = this.transport;

		const threadId = this.threadId;
		const turnId = this.activeTurnId;
		if (transport !== null && threadId !== null && turnId !== null) {
			const outcome = await this.interruptTurn(threadId, turnId, this.shutdownInterruptTimeoutMs);
			steps.push(`interrupt:${outcome.status}`);
			if (outcome.status === 'interrupted') {
				const terminal = await this.waitForTerminalOrGrace(turnId, this.shutdownGraceMs);
				steps.push(`terminal:${terminal}`);
			}
		} else {
			steps.push('no-active-turn');
		}

		this.approvals.dispose();
		if (child !== null && !child.killed) {
			child.stdin?.end();
			steps.push('stdin-closed');
			const exited = await waitForChildExit(child, this.shutdownGraceMs);
			if (!exited) {
				steps.push('kill-tree');
				forcedKill = true;
				await killProcessTree(child.pid);
			} else {
				steps.push('exited');
			}
		}
		transport?.close('supervisor shutdown');
		if (this.jobObject !== null) {
			try {
				await this.jobObject.close();
				steps.push('job-object-closed');
			} catch (error) {
				steps.push(
					`job-object-close-failed:${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
		this.stateValue = 'closed';
		this.child = null;
		this.transport = null;
		return { steps, durationMs: Date.now() - startedAt, forcedKill };
	}

	/** Answer a pending approval. Returns false when the id is unknown. */
	decideApproval(approvalId: string, decision: ApprovalDecision): boolean {
		return this.approvals.decide(approvalId, decision);
	}

	private handleNotification(notification: InboundNotification): void {
		if (notification.method === 'turn/completed' || notification.method === 'turn/failed') {
			const turn = notification.params;
			if (isRecord(turn) && isRecord(turn.turn) && typeof turn.turn.id === 'string') {
				this.completeTurn(turn.turn.id, notification);
			}
		}
		if (this.events.onNotification !== undefined) {
			try {
				this.events.onNotification(notification);
			} catch (error) {
				this.logger.error(
					`notification listener failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
		for (const listener of this.notificationListeners) {
			try {
				listener(notification);
			} catch (error) {
				this.logger.error(
					`notification listener failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	private completeTurn(turnId: string, notification: InboundNotification): void {
		if (this.activeTurnId === turnId) this.activeTurnId = null;
		this.completedTurnIds.add(turnId);
		this.completedTurnNotifications.set(turnId, notification);
		if (this.completedTurnNotifications.size > 64) {
			const oldest = this.completedTurnNotifications.keys().next();
			if (!oldest.done) this.completedTurnNotifications.delete(oldest.value);
		}
		if (this.completedTurnIds.size > 64) {
			const oldest = this.completedTurnIds.values().next();
			if (!oldest.done) this.completedTurnIds.delete(oldest.value);
		}
		const waiter = this.turnWaiters.get(turnId);
		if (waiter === undefined) return;
		this.turnWaiters.delete(turnId);
		clearTimeout(waiter.timer);
		waiter.resolve(notification);
	}

	private clearTurn(turnId: string): void {
		if (this.activeTurnId === turnId) this.activeTurnId = null;
	}

	private async handleServerRequest(request: InboundRequest): Promise<void> {
		const transport = this.requireTransport();
		const method = request.method;
		if (method === SERVER_REQUEST_METHODS.commandExecutionApproval) {
			this.registerApproval(request, 'commandExecution');
			return;
		}
		if (method === SERVER_REQUEST_METHODS.fileChangeApproval) {
			this.registerApproval(request, 'fileChange');
			return;
		}
		if (method === SERVER_REQUEST_METHODS.permissionsApproval) {
			this.registerApproval(request, 'permissions');
			return;
		}
		if (method === SERVER_REQUEST_METHODS.toolRequestUserInput) {
			this.registerApproval(request, 'userInput');
			return;
		}
		if (method === SERVER_REQUEST_METHODS.dynamicToolCall) {
			await this.handleDynamicToolCall(request);
			return;
		}
		if (method === SERVER_REQUEST_METHODS.mcpElicitation) {
			if (!isMcpElicitationRequestParams(request.params)) {
				transport.respondError(request.id, -32602, 'invalid elicitation params');
				return;
			}
			transport.respond(request.id, { action: 'decline', content: null, _meta: null });
			return;
		}
		if (
			method === SERVER_REQUEST_METHODS.applyPatchApproval ||
			method === SERVER_REQUEST_METHODS.execCommandApproval
		) {
			if (!isLegacyApprovalParams(request.params)) {
				transport.respondError(request.id, -32602, 'invalid legacy approval params');
				return;
			}
			this.registerApproval(request, 'legacy');
			return;
		}
		transport.respondError(request.id, -32601, `unsupported server request ${method}`);
	}

	private registerApproval(request: InboundRequest, kind: ApprovalKind): void {
		const params = request.params;
		const approvalId = `${String(request.id)}:${readItemId(params)}`;
		const respond = this.buildApprovalResponder(request, kind);
		const threadId =
			readStringField(params, 'threadId') ?? readStringField(params, 'conversationId') ?? '';
		const turnId = readStringField(params, 'turnId') ?? '';
		const itemId = readItemId(params);
		const view = this.approvals.register({
			approvalId,
			kind,
			threadId,
			turnId,
			itemId,
			respond,
		});
		const hostRequest: ApprovalHostRequest = {
			...view,
			command: readStringField(params, 'command') ?? null,
			reason: readStringField(params, 'reason') ?? null,
		};
		const handler = this.events.onApprovalRequest;
		if (handler === undefined) return;
		let result: ApprovalDecision | Promise<ApprovalDecision> | undefined;
		try {
			result = handler(hostRequest);
		} catch (error) {
			this.logger.error(
				`approval handler failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			this.approvals.decide(approvalId, 'decline');
			return;
		}
		if (result === undefined) return;
		void Promise.resolve(result)
			.then((decision) => {
				this.approvals.decide(approvalId, decision);
			})
			.catch((error: unknown) => {
				this.logger.error(
					`approval decision failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				this.approvals.decide(approvalId, 'decline');
			});
	}

	private buildApprovalResponder(
		request: InboundRequest,
		kind: ApprovalKind,
	): (decision: ApprovalDecision) => void {
		const transport = this.requireTransport();
		const params = request.params;
		return (decision: ApprovalDecision) => {
			if (kind === 'permissions') {
				if (decision === 'accept' && isRecord(params) && 'permissions' in params) {
					transport.respond(request.id, { permissions: params.permissions, scope: 'turn' });
				} else {
					transport.respond(request.id, { permissions: {}, scope: 'turn' });
				}
				return;
			}
			if (kind === 'userInput') {
				transport.respond(request.id, { answers: {} });
				return;
			}
			if (kind === 'legacy') {
				const legacyDecision =
					decision === 'accept' || decision === 'acceptForSession'
						? 'approved'
						: { denied: { rejection: 'declined by host' } };
				transport.respond(request.id, { decision: legacyDecision });
				return;
			}
			transport.respond(request.id, { decision });
		};
	}

	private async handleDynamicToolCall(request: InboundRequest): Promise<void> {
		const transport = this.requireTransport();
		if (!isDynamicToolCallParams(request.params)) {
			transport.respondError(request.id, -32602, 'invalid dynamic tool call params');
			return;
		}
		const handler = this.events.onDynamicToolCall;
		if (handler === undefined) {
			transport.respondError(
				request.id,
				-32601,
				`no dynamic tool handler for ${request.params.tool}`,
			);
			return;
		}
		try {
			const response = await handler(request.params);
			transport.respond(request.id, response);
		} catch (error) {
			transport.respondError(
				request.id,
				-32603,
				`dynamic tool failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async waitForTerminalOrGrace(turnId: string, timeoutMs: number): Promise<string> {
		if (this.completedTurnIds.has(turnId)) return 'already-terminal';
		return await new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.turnWaiters.delete(turnId);
				resolve('timeout');
			}, timeoutMs);
			this.turnWaiters.set(turnId, {
				resolve: () => {
					clearTimeout(timer);
					resolve('completed');
				},
				reject: () => {
					clearTimeout(timer);
					resolve('error');
				},
				timer,
			});
		});
	}

	private onChildExit(info: {
		code: number | null;
		signal: NodeJS.Signals | null;
		reason: string;
	}): void {
		this.stateValue = 'closed';
		for (const [turnId, waiter] of this.turnWaiters) {
			this.turnWaiters.delete(turnId);
			clearTimeout(waiter.timer);
			waiter.reject(new TransportClosedError(info.reason));
		}
		this.transport?.close('process exit');
		this.events.onExit?.(info);
	}

	private requireTransport(): JsonlTransport {
		if (this.transport === null)
			throw new ProtocolError('transport is not running; call start() first');
		return this.transport;
	}
}

function isNoActiveTurnError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	if ('code' in error && typeof error.code === 'number' && error.code === NO_ACTIVE_TURN_CODE)
		return true;
	return error.message.includes('no active turn');
}

function readStringField(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	const field = value[key];
	return typeof field === 'string' ? field : undefined;
}

function readItemId(value: unknown): string {
	if (isRecord(value)) {
		const itemId = value.itemId;
		if (typeof itemId === 'string') return itemId;
		const callId = value.callId;
		if (typeof callId === 'string') return callId;
	}
	return 'unknown-item';
}

async function waitForChildExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
	return await new Promise((resolve) => {
		if (child.exitCode !== null || child.signalCode !== null) {
			resolve(true);
			return;
		}
		const timer = setTimeout(() => {
			child.off('exit', onExit);
			resolve(false);
		}, timeoutMs);
		const onExit = () => {
			clearTimeout(timer);
			resolve(true);
		};
		child.once('exit', onExit);
	});
}

export function resolveDefaultExePath(): string | null {
	if (process.platform !== 'win32') return null;
	const home = process.env.USERPROFILE;
	if (home === undefined) return null;
	return path.join(
		home,
		'IdeaProjects',
		'easyCode',
		'dist',
		'easyCode-windows-x64-portable',
		'bin',
		'easycode.exe',
	);
}

async function killProcessTree(pid: number | undefined): Promise<void> {
	if (pid === undefined) return;
	if (process.platform === 'win32') {
		await new Promise<void>((resolve) => {
			execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => {
				resolve();
			});
		});
		return;
	}
	try {
		process.kill(pid, 'SIGKILL');
	} catch {
		// The process may already be gone.
	}
	await new Promise<void>((resolve) => {
		setTimeout(resolve, KILL_TIMEOUT_MS);
	});
}

// Keep protocol validator exports reachable for hosts that route raw requests.
export {
	isCommandExecutionApprovalParams,
	isFileChangeApprovalParams,
	isToolRequestUserInputParams,
	isPermissionsApprovalParams,
	isLegacyApprovalParams,
};

export type { ResponseParser };
