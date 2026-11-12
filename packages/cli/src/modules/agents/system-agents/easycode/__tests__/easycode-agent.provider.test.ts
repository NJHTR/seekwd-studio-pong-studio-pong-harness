import type { User } from '@pong/db';
import { mock } from 'vitest-mock-extended';

// The provider asks the permission layer for `project:read`. A bare mock user has
// no role, so the real check would throw instead of refusing.
vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(async () => true),
}));

import type { AgentExecutionThread } from '../../../entities/agent-execution-thread.entity';
import type { AgentRepository } from '../../../repositories/agent.repository';
import type { AgentExecutionThreadRepository } from '../../../repositories/agent-execution-thread.repository';
import { SystemAgentRegistrationService } from '../../system-agent-registration.service';
import { SystemAgentRegistry } from '../../system-agent-registry';
import type { SystemAgentProvider, SystemAgentTurn } from '../../system-agent.types';
import { EasycodeAgentProvider, registerEasycodeSystemAgent } from '../easycode-agent.provider';
import { EasycodeRuntimeAgent } from '../easycode-runtime-agent';
import type { EasycodeSupervisorFactoryService } from '../easycode-supervisor-factory.service';
import type {
	EasycodeInterruptResult,
	EasycodeNotification,
	EasycodeStartTurnParams,
	EasycodeSupervisorPort,
	EasycodeThreadStartParams,
} from '../easycode-supervisor.port';

class FakeSupervisor implements EasycodeSupervisorPort {
	readonly easycodeHome = 'C:/fake-easycode-home';

	shutDown = false;

	readonly resumes: string[] = [];

	async start(): Promise<void> {}

	async startThread(_params: EasycodeThreadStartParams): Promise<{ threadId: string }> {
		return { threadId: 'easycode-thread-1' };
	}

	async resumeThread(params: { threadId: string }): Promise<{ threadId: string }> {
		this.resumes.push(params.threadId);
		return { threadId: params.threadId };
	}

	async startTurn(
		_threadId: string,
		_prompt: string,
		_params: EasycodeStartTurnParams,
	): Promise<{ turnId: string }> {
		return { turnId: 'turn-1' };
	}

	async interruptTurn(): Promise<EasycodeInterruptResult> {
		return { status: 'no-active-turn' };
	}

	async shutdown(): Promise<void> {
		this.shutDown = true;
	}

	onNotification(_listener: (notification: EasycodeNotification) => void): () => void {
		return () => undefined;
	}
}

const THREAD = {
	id: 'thread-1',
	projectId: 'project-1',
	agentId: 'easycode',
} as unknown as AgentExecutionThread;

function createStartTurn(message = 'build a workflow'): SystemAgentTurn {
	return {
		type: 'start',
		user: {} as User,
		thread: THREAD,
		resourceId: 'draft-chat:user-1',
		abortSignal: new AbortController().signal,
		memory: {},
		checkpointStore: {},
		sessionGrants: {
			load: async () => new Set<string>(),
			grant: async () => undefined,
			revoke: async () => undefined,
		},
		emitHostEvent: () => undefined,
		readFile: async () => undefined,
		executionId: 'execution-1',
		message,
		attachments: [],
		readAttachment: async () => undefined,
		options: {},
	} as unknown as SystemAgentTurn;
}

function setup() {
	const registry = new SystemAgentRegistry();
	const agentRepository = mock<AgentRepository>();
	const registration = new SystemAgentRegistrationService(registry, agentRepository);
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const supervisor = new FakeSupervisor();
	const supervisorFactory = mock<EasycodeSupervisorFactoryService>();
	supervisorFactory.create.mockReturnValue(supervisor);
	const provider = new EasycodeAgentProvider(threadRepository, supervisorFactory);
	return { registry, registration, threadRepository, supervisor, supervisorFactory, provider };
}

describe('registerEasycodeSystemAgent', () => {
	it('does not register the provider when the flag is off', async () => {
		const { registry, registration, provider } = setup();

		const registered = await registerEasycodeSystemAgent(registration, provider, {});

		expect(registered).toBe(false);
		expect(registry.has('easycode')).toBe(false);
	});

	it('registers the provider when PONG_EASYCODE_RUNTIME=1', async () => {
		const { registry, registration, provider } = setup();

		const registered = await registerEasycodeSystemAgent(registration, provider, {
			PONG_EASYCODE_RUNTIME: '1',
		});

		expect(registered).toBe(true);
		expect(registry.get('easycode')).toBe(provider);
	});
});

describe('EasycodeAgentProvider', () => {
	it('builds a runtime agent for the turn and stores the runtime binding', async () => {
		const { provider, threadRepository, supervisorFactory, supervisor } = setup();
		threadRepository.findRuntimeBinding.mockResolvedValue(null);

		const handle = await provider.prepareTurn(createStartTurn());

		expect(supervisorFactory.create).toHaveBeenCalledWith({
			threadId: 'thread-1',
			cwd: expect.any(String),
		});
		expect(handle.agent).toBeInstanceOf(EasycodeRuntimeAgent);
		expect(handle.input).toBe('build a workflow');
		expect(handle.toolRegistry?.size).toBe(0);
		expect(threadRepository.saveRuntimeBinding).toHaveBeenCalledWith(
			'thread-1',
			{ runtimeKind: 'easycode', runtimeThreadId: 'easycode-thread-1' },
			{},
		);

		await handle.onSettled?.({
			status: 'completed',
			executionId: 'execution-1',
		});
		expect(supervisor.shutDown).toBe(true);
	});

	it('resumes the easyCode thread that the thread already uses', async () => {
		const { provider, threadRepository, supervisor } = setup();
		threadRepository.findRuntimeBinding.mockResolvedValue({
			runtimeKind: 'easycode',
			runtimeThreadId: 'easycode-thread-old',
		});

		await provider.prepareTurn(createStartTurn());

		expect(supervisor.resumes).toEqual(['easycode-thread-old']);
		expect(threadRepository.saveRuntimeBinding).toHaveBeenCalledWith(
			'thread-1',
			{ runtimeKind: 'easycode', runtimeThreadId: 'easycode-thread-old' },
			{},
		);
	});

	it('closes the supervisor when the app-server cannot start', async () => {
		const { provider, threadRepository, supervisorFactory, supervisor } = setup();
		threadRepository.findRuntimeBinding.mockResolvedValue(null);
		const failing = new FakeSupervisor();
		failing.start = async () => {
			throw new Error('binary missing');
		};
		supervisorFactory.create.mockReturnValue(failing);

		await expect(provider.prepareTurn(createStartTurn())).rejects.toThrow('binary missing');

		expect(failing.shutDown).toBe(true);
		expect(threadRepository.saveRuntimeBinding).not.toHaveBeenCalled();
		expect(supervisor.shutDown).toBe(false);
	});

	it('formats setup and turn errors for the client', async () => {
		const { provider } = setup();

		await expect(provider.formatSetupError({} as User, new Error('no binary'))).resolves.toEqual({
			message: 'no binary',
			code: 'easycode_setup_failed',
		});
	});

	it('requires project read access', async () => {
		const { provider } = setup();

		await expect(provider.authorize({} as User, 'project-1')).resolves.toBe(true);
	});

	it('exposes the provider contract', () => {
		const { provider } = setup();
		const asProvider: SystemAgentProvider = provider;

		expect(asProvider.agentId).toBe('easycode');
		expect(asProvider.name).toBe('easyCode');
	});
});
