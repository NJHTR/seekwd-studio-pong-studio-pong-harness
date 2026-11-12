import { resolveDefaultExePath, AppServerSupervisor } from '@pong/easycode-runtime';
import type {
	ApprovalHostRequest,
	DynamicToolCallParams,
	SupervisorLogger,
} from '@pong/easycode-runtime';
import { Logger } from '@pong/backend-common';
import { Service } from '@pong/di';
import { UnexpectedError } from '@pong/errors';

import {
	EASYCODE_BIN_ENV,
	EASYCODE_CLOSE_TIMEOUT_MS,
	EASYCODE_HOME_ENV,
} from './easycode.constants';
import type {
	EasycodeApprovalDecision,
	EasycodeApprovalKind,
	EasycodeInterruptResult,
	EasycodeNotification,
	EasycodePendingApproval,
	EasycodeServerHandlers,
	EasycodeStartTurnParams,
	EasycodeSupervisorCreateOptions,
	EasycodeSupervisorFactory,
	EasycodeSupervisorPort,
	EasycodeThreadStartParams,
} from './easycode-supervisor.port';

/** The binary path is unknown or missing. Setup errors reach the user, so this is expected. */
export class EasycodeBinaryUnavailableError extends UnexpectedError {
	constructor(message: string) {
		super(message);
	}
}

/** Resolve the easyCode binary: `PONG_EASYCODE_BIN`, else the portable Windows path. */
export function resolveEasycodeBinaryPath(env: NodeJS.ProcessEnv = process.env): string | null {
	const configured = env[EASYCODE_BIN_ENV];
	if (configured !== undefined && configured.trim() !== '') return configured;
	return resolveDefaultExePath();
}

const DEFAULT_APP_SERVER_ARGS = ['app-server', '--listen', 'stdio://'];

/**
 * Adapts `AppServerSupervisor` to the narrow port. The supervisor owns the
 * child process, the approval broker and the dynamic tool dispatch; this
 * adapter only maps the calls and payload types.
 */
class SupervisorPortAdapter implements EasycodeSupervisorPort {
	constructor(
		private readonly supervisor: AppServerSupervisor,
		private readonly cwd: string,
	) {}

	get easycodeHome(): string {
		return this.supervisor.easycodeHome;
	}

	async start(): Promise<void> {
		await this.supervisor.start();
	}

	async startThread(params: EasycodeThreadStartParams): Promise<{ threadId: string }> {
		const response = await this.supervisor.startThread({
			cwd: params.cwd,
			model: params.model ?? null,
			approvalPolicy: 'on-request',
			approvalsReviewer: 'user',
			sandbox: 'workspace-write',
			developerInstructions: params.developerInstructions ?? null,
			dynamicTools: params.dynamicTools ?? null,
		});
		return { threadId: response.thread.id };
	}

	async resumeThread(params: { threadId: string }): Promise<{ threadId: string }> {
		const response = await this.supervisor.resumeThread({
			threadId: params.threadId,
			cwd: this.cwd,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
		});
		return { threadId: response.thread.id };
	}

	async startTurn(
		threadId: string,
		prompt: string,
		params: EasycodeStartTurnParams,
	): Promise<{ turnId: string }> {
		const response = await this.supervisor.startTurn(threadId, prompt, {
			model: params.model,
			cwd: params.cwd,
			approvalPolicy: 'on-request',
			sandboxPolicy: {
				type: 'workspaceWrite',
				writableRoots: [params.cwd],
				// ADR-01: network access stays off until the approval bridge covers it.
				networkAccess: false,
				excludeTmpdirEnvVar: false,
				excludeSlashTmp: false,
			},
		});
		return { turnId: response.turn.id };
	}

	async interruptTurn(
		threadId: string,
		turnId: string,
		timeoutMs?: number,
	): Promise<EasycodeInterruptResult> {
		const outcome = await this.supervisor.interruptTurn(
			threadId,
			turnId,
			timeoutMs ?? EASYCODE_CLOSE_TIMEOUT_MS,
		);
		return { status: outcome.status };
	}

	async shutdown(): Promise<void> {
		await this.supervisor.shutdown();
	}

	onNotification(listener: (notification: EasycodeNotification) => void): () => void {
		return this.supervisor.onNotification((notification) => {
			listener({ method: notification.method, params: notification.params });
		});
	}

	decideApproval(approvalId: string, decision: EasycodeApprovalDecision): boolean {
		return this.supervisor.decideApproval(approvalId, decision);
	}

	pendingApprovals(): EasycodePendingApproval[] {
		return this.supervisor.approvals.pendingApprovals().map((view) => ({
			approvalId: view.approvalId,
			kind: view.kind,
			threadId: view.threadId,
			turnId: view.turnId,
			itemId: view.itemId,
			deadlineAtMs: view.deadlineAtMs,
		}));
	}
}

function toSupervisorLogger(logger: Logger): SupervisorLogger {
	const scoped = logger.scoped('agents');
	return {
		debug: (message: string) => scoped.debug(message),
		warn: (message: string) => scoped.warn(message),
		error: (message: string) => scoped.error(message),
	};
}

/** Creates the app-server supervisor of one turn. Injected so tests can fake it. */
@Service()
export class EasycodeSupervisorFactoryService implements EasycodeSupervisorFactory {
	constructor(private readonly logger: Logger) {}

	create(options: EasycodeSupervisorCreateOptions): EasycodeSupervisorPort {
		const exePath = options.exePath ?? resolveEasycodeBinaryPath();
		if (exePath === null) {
			throw new EasycodeBinaryUnavailableError(
				'The easyCode runtime is enabled but no binary is configured. Set PONG_EASYCODE_BIN to the easycode executable.',
			);
		}
		const handlers: EasycodeServerHandlers = options.handlers ?? {};
		const easycodeHome = process.env[EASYCODE_HOME_ENV];
		const supervisor = new AppServerSupervisor({
			exePath,
			appServerArgs: options.appServerArgs ?? DEFAULT_APP_SERVER_ARGS,
			cwd: options.cwd,
			agentId: options.threadId,
			logger: toSupervisorLogger(this.logger),
			events: {
				onApprovalRequest: (request: ApprovalHostRequest) => {
					handlers.onApprovalRequest?.({
						approvalId: request.approvalId,
						kind: toPortKind(request.kind),
						threadId: request.threadId,
						turnId: request.turnId,
						itemId: request.itemId,
						command: request.command,
						reason: request.reason,
					});
					// The bridge answers later through `decideApproval`, so the
					// supervisor keeps its broker entry pending.
					return undefined;
				},
				onDynamicToolCall: async (call: DynamicToolCallParams) => {
					const handler = handlers.onDynamicToolCall;
					if (handler === undefined) {
						return {
							contentItems: [{ type: 'inputText', text: 'Dynamic tools are not wired.' }],
							success: false,
						};
					}
					const result = await handler({
						threadId: call.threadId,
						turnId: call.turnId,
						callId: call.callId,
						tool: call.tool,
						arguments: call.arguments,
					});
					return {
						contentItems: [{ type: 'inputText', text: result.text }],
						success: result.success,
					};
				},
			},
			...(easycodeHome !== undefined && easycodeHome.trim() !== '' ? { easycodeHome } : {}),
		});
		return new SupervisorPortAdapter(supervisor, options.cwd);
	}
}

function toPortKind(kind: string): EasycodeApprovalKind {
	if (kind === 'commandExecution' || kind === 'fileChange' || kind === 'permissions') return kind;
	if (kind === 'userInput') return 'userInput';
	return 'legacy';
}
