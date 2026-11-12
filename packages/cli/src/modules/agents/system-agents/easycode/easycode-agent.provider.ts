import { Service } from '@pong/di';
import type { User } from '@pong/db';
import { getErrorMessage } from '@pong/utils/errors/get-error-message';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import { AgentThreadGrantRepository } from '../../repositories/agent-thread-grant.repository';
import type { FormattedTurnError } from '../../types/agent-turn-outcome';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
} from '../system-agent.types';
import { SystemAgentRegistrationService } from '../system-agent-registration.service';
import { EasycodeApprovalBridge } from './approval-bridge';
import { EasycodeApprovalRegistry } from './easycode-approval-registry';
import { EasycodeArtifactBridge } from './artifact-bridge';
import { EasycodeAttachmentArtifactSink } from './artifact-sink';
import {
	EASYCODE_AGENT_ID,
	EASYCODE_AGENT_NAME,
	EASYCODE_RUNTIME_KIND,
	isEasycodeRuntimeEnabled,
	resolveEasycodeModel,
	resolveEasycodeWorkingDirectory,
} from './easycode.constants';
import { EasycodeDynamicToolset, type EasycodeDynamicTool } from './dynamic-tools';
import { EasycodeRuntimeAgent } from './easycode-runtime-agent';
import type { EasycodeApprovalDecision } from './easycode-supervisor.port';
import { EasycodeSupervisorFactoryService } from './easycode-supervisor-factory.service';
import { EasycodeThreadStateStore } from './thread-state';

/** The pong tools that easyCode may call. Keep it small: each spec costs prompt tokens. */
function createTools(input: { threadId: string; cwd: string }): EasycodeDynamicTool[] {
	return [
		{
			name: 'pong_thread_info',
			description:
				'Return the pong thread id, the agent id and the working directory of this conversation. Read-only.',
			inputSchema: { type: 'object', properties: {}, additionalProperties: false },
			handler: async () =>
				JSON.stringify({
					threadId: input.threadId,
					agentId: EASYCODE_AGENT_ID,
					cwd: input.cwd,
				}),
		},
	];
}

/**
 * The easyCode runtime as a pong system agent.
 *
 * It reuses the `/agents/system` routes, the Agents queue, the execution
 * records, the checkpoints and the SSE channel. The provider builds the
 * per-turn supervisor, the approval bridge, the artifact bridge and the dynamic
 * toolset, and stores which runtime a thread uses.
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
		private readonly grantsRepository: AgentThreadGrantRepository,
		private readonly approvalRegistry: EasycodeApprovalRegistry,
		private readonly attachments: AgentChatAttachmentService,
	) {}

	async authorize(user: User, projectId: string): Promise<boolean> {
		return await userHasScopes(user, ['project:read'], false, { projectId });
	}

	async chatTurnOptions(): Promise<SystemAgentTurnOptions> {
		return {};
	}

	/** A resume payload keeps its shape: the agent reads the approval id and decision. */
	normalizeResumeData(resumeData: unknown): unknown {
		return resumeData;
	}

	async prepareTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
		const threadId = turn.thread.id;
		const existing = await this.threadRepository.findRuntimeBinding(threadId);
		const cwd = resolveEasycodeWorkingDirectory();
		const model = resolveEasycodeModel();
		const emit = turn.emitHostEvent;

		// The approval bridge and the supervisor form a cycle: the supervisor calls
		// the bridge, and the bridge answers through the supervisor broker. The
		// indirection breaks it without a cast or a null assertion.
		let decideApproval: (approvalId: string, decision: EasycodeApprovalDecision) => boolean = () =>
			false;
		let answerUserInput: (
			approvalId: string,
			answers: Record<string, { answers: string[] }>,
		) => boolean = () => false;
		const approvalBridge = new EasycodeApprovalBridge({
			threadId,
			emit,
			grants: {
				load: async () => await this.grantsRepository.findKeys(threadId),
				grant: async (grantKey) => {
					await this.grantsRepository.grant(threadId, grantKey);
				},
			},
			decide: (approvalId, decision) => decideApproval(approvalId, decision),
			answerUserInput: (approvalId, answers) => answerUserInput(approvalId, answers),
		});
		await approvalBridge.loadGrants();

		const toolset = new EasycodeDynamicToolset({
			threadId,
			tools: createTools({ threadId, cwd }),
			approver: { ask: async (request) => await approvalBridge.ask(request) },
			emit,
		});

		const supervisor = this.supervisorFactory.create({
			threadId,
			cwd,
			handlers: {
				onApprovalRequest: (request) => approvalBridge.request(request),
				onDynamicToolCall: async (call) => await toolset.handle(call),
			},
		});
		decideApproval = (approvalId, decision) => supervisor.decideApproval(approvalId, decision);
		answerUserInput = (approvalId, answers) => supervisor.answerUserInput(approvalId, answers);

		const artifacts = new EasycodeArtifactBridge({
			threadId,
			emit,
			sink: new EasycodeAttachmentArtifactSink(this.attachments, {
				agentId: EASYCODE_AGENT_ID,
				projectId: turn.thread.projectId,
				threadId,
				...(turn.resourceId !== undefined ? { resourceId: turn.resourceId } : {}),
			}),
		});
		const agent = new EasycodeRuntimeAgent({
			threadId,
			cwd,
			supervisor,
			resumeThreadId: existing?.runtimeThreadId ?? null,
			...(model !== undefined ? { model } : {}),
			toolset,
			artifactBridge: artifacts,
			approvalBridge,
			threadStateStore: EasycodeThreadStateStore.forHome(supervisor.easycodeHome),
			emitHostEvent: emit,
		});

		let easycodeThreadId: string;
		try {
			const prepared = await agent.prepare();
			easycodeThreadId = prepared.easycodeThreadId;
		} catch (error) {
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
			// Best effort.
		}

		// The chat controller answers an approval by thread id, so the bridge of
		// this turn must be reachable until the turn settles.
		this.approvalRegistry.register(threadId, approvalBridge);

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
				this.approvalRegistry.unregister(threadId, approvalBridge);
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
