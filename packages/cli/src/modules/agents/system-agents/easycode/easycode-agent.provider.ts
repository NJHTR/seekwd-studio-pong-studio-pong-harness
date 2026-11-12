import { Service } from '@pong/di';
import type { User } from '@pong/db';
import { getErrorMessage } from '@pong/utils/errors/get-error-message';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { FormattedTurnError } from '../../types/agent-turn-outcome';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
} from '../system-agent.types';
import { SystemAgentRegistrationService } from '../system-agent-registration.service';
import {
	EASYCODE_AGENT_ID,
	EASYCODE_AGENT_NAME,
	EASYCODE_RUNTIME_KIND,
	isEasycodeRuntimeEnabled,
	resolveEasycodeModel,
	resolveEasycodeWorkingDirectory,
} from './easycode.constants';
import { EasycodeRuntimeAgent } from './easycode-runtime-agent';
import { EasycodeSupervisorFactoryService } from './easycode-supervisor-factory.service';

/**
 * The easyCode runtime as a pong system agent.
 *
 * It reuses the `/agents/system` routes, the Agents queue, the execution
 * records, the checkpoints and the SSE channel. The provider only builds the
 * per-turn app-server supervisor and stores which runtime a thread uses.
 *
 * Opt-in: a module registers it only when `PONG_EASYCODE_RUNTIME=1`
 * (see `register-easycode-agent.ts`).
 */
@Service()
export class EasycodeAgentProvider implements SystemAgentProvider {
	readonly agentId = EASYCODE_AGENT_ID;

	readonly name = EASYCODE_AGENT_NAME;

	constructor(
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly supervisorFactory: EasycodeSupervisorFactoryService,
	) {}

	async authorize(user: User, projectId: string): Promise<boolean> {
		return await userHasScopes(user, ['project:read'], false, { projectId });
	}

	async chatTurnOptions(): Promise<SystemAgentTurnOptions> {
		return {};
	}

	async prepareTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
		const threadId = turn.thread.id;
		const existing = await this.threadRepository.findRuntimeBinding(threadId);
		const cwd = resolveEasycodeWorkingDirectory();
		const model = resolveEasycodeModel();
		const supervisor = this.supervisorFactory.create({ threadId, cwd });
		const agent = new EasycodeRuntimeAgent({
			threadId,
			cwd,
			supervisor,
			resumeThreadId: existing?.runtimeThreadId ?? null,
			...(model !== undefined ? { model } : {}),
		});

		let easycodeThreadId: string;
		try {
			const prepared = await agent.prepare();
			easycodeThreadId = prepared.easycodeThreadId;
		} catch (error) {
			// The supervisor may already hold a child process.
			await agent.close();
			throw error;
		}

		// The binding is a cache of the easyCode thread. A failed write must not
		// fail the turn: the next turn starts a new easyCode thread instead.
		try {
			await this.threadRepository.saveRuntimeBinding(
				threadId,
				{ runtimeKind: EASYCODE_RUNTIME_KIND, runtimeThreadId: easycodeThreadId },
				{},
			);
		} catch {
			// Best effort. The turn already has its thread.
		}

		const handle: SystemAgentTurnHandle = {
			agent,
			toolRegistry: new Map(),
			...(turn.type === 'start' ? { input: turn.message } : {}),
			runOptions: {},
			formatError: async (error: unknown): Promise<FormattedTurnError | undefined> => ({
				message: getErrorMessage(error),
				code: 'easycode_failed',
			}),
			onSettled: async () => {
				// The Agents runtime keeps no cache of system-agent runtimes, so the
				// provider owns the child process of the turn.
				await agent.close();
			},
		};
		return handle;
	}

	async formatSetupError(_user: User, error: unknown): Promise<FormattedTurnError | undefined> {
		return { message: getErrorMessage(error), code: 'easycode_setup_failed' };
	}
}

/**
 * Register the provider when the instance opts in. The registry is the only
 * place the Agents runtime looks up a system agent, so a disabled flag leaves
 * every existing agent untouched.
 */
export async function registerEasycodeSystemAgent(
	registration: Pick<SystemAgentRegistrationService, 'register'>,
	provider: SystemAgentProvider,
	env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
	if (!isEasycodeRuntimeEnabled(env)) return false;
	await registration.register(provider);
	return true;
}
