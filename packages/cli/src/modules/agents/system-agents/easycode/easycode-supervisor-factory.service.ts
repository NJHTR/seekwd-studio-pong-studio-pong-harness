import { resolveDefaultExePath, AppServerSupervisor } from '@pong/easycode-runtime';
import type { SupervisorLogger } from '@pong/easycode-runtime';
import { Logger } from '@pong/backend-common';
import { Service } from '@pong/di';
import { UnexpectedError } from '@pong/errors';

import {
	EASYCODE_BIN_ENV,
	EASYCODE_CLOSE_TIMEOUT_MS,
	EASYCODE_HOME_ENV,
} from './easycode.constants';
import type {
	EasycodeInterruptResult,
	EasycodeNotification,
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
		this.name = 'EasycodeBinaryUnavailableError';
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
 * Adapts `AppServerSupervisor` to the narrow port. The supervisor is the only
 * owner of the child process; this adapter only maps the calls of one turn and
 * the sandbox policy that ADR-01 fixes for the single-user desktop.
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
			dynamicTools: [],
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
				// ADR-01: network access stays off until an approval bridge exists.
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
		const easycodeHome = process.env[EASYCODE_HOME_ENV];
		const supervisor = new AppServerSupervisor({
			exePath,
			appServerArgs: options.appServerArgs ?? DEFAULT_APP_SERVER_ARGS,
			cwd: options.cwd,
			agentId: options.threadId,
			events: {},
			logger: toSupervisorLogger(this.logger),
			...(easycodeHome !== undefined && easycodeHome.trim() !== '' ? { easycodeHome } : {}),
		});
		return new SupervisorPortAdapter(supervisor, options.cwd);
	}
}
