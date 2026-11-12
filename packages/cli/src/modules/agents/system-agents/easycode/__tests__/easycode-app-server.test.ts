import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Logger } from '@pong/backend-common';
import type { User } from '@pong/db';
import type { StreamChunk } from '@pong/agents';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../../entities/agent-execution-thread.entity';
import type { AgentExecutionThreadRepository } from '../../../repositories/agent-execution-thread.repository';
import type { AgentThreadGrantRepository } from '../../../repositories/agent-thread-grant.repository';
import type { AgentChatAttachmentService } from '../../../agent-chat-attachment.service';
import { EasycodeAgentProvider } from '../easycode-agent.provider';
import { EasycodeApprovalRegistry } from '../easycode-approval-registry';
import { EasycodeSupervisorFactoryService } from '../easycode-supervisor-factory.service';
import type { SystemAgentTurn } from '../../system-agent.types';
import type { EasycodeSupervisorCreateOptions } from '../easycode-supervisor.port';
import { FAKE_APP_SERVER_SOURCE } from './fixtures/fake-easycode-app-server-source';

const FIXTURE_ARGS = ['-e', FAKE_APP_SERVER_SOURCE];

const noopLogger = {
	scoped: () => ({ debug: () => undefined, warn: () => undefined, error: () => undefined }),
} as unknown as Logger;

const THREAD = {
	id: 'thread-easycode-it',
	projectId: 'project-1',
	agentId: 'easycode',
} as unknown as AgentExecutionThread;

async function readChunks(stream: ReadableStream<StreamChunk>): Promise<StreamChunk[]> {
	const reader = stream.getReader();
	const chunks: StreamChunk[] = [];
	for (;;) {
		const next = await reader.read();
		if (next.done) return chunks;
		chunks.push(next.value);
	}
}

function startTurn(): SystemAgentTurn {
	return {
		type: 'start',
		user: { id: 'user-1' } as User,
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
		message: 'say hi',
		attachments: [],
		readAttachment: async () => undefined,
		options: {},
	} as unknown as SystemAgentTurn;
}

describe('easyCode runtime against a fake app-server', () => {
	let home: string;

	beforeEach(async () => {
		home = await mkdtemp(join(tmpdir(), 'pong-easycode-'));
		process.env.PONG_EASYCODE_HOME = home;
	});

	afterEach(async () => {
		delete process.env.PONG_EASYCODE_HOME;
		await rm(home, { recursive: true, force: true });
	});

	it('runs one turn from thread start to close', async () => {
		const threadRepository = mock<AgentExecutionThreadRepository>();
		threadRepository.findRuntimeBinding.mockResolvedValue(null);
		const factory = new EasycodeSupervisorFactoryService(noopLogger);
		const grantsRepository = mock<AgentThreadGrantRepository>();
		grantsRepository.findKeys.mockResolvedValue(new Set());
		const provider = new EasycodeAgentProvider(
			threadRepository,
			{
				create: (options: EasycodeSupervisorCreateOptions) =>
					factory.create({ ...options, exePath: process.execPath, appServerArgs: FIXTURE_ARGS }),
			} as unknown as EasycodeSupervisorFactoryService,
			grantsRepository,
			new EasycodeApprovalRegistry(),
			mock<AgentChatAttachmentService>(),
		);

		const handle = await provider.prepareTurn(startTurn());
		const run = await handle.agent.stream('say hi', {});
		const chunks = await readChunks(run.stream);

		expect(chunks).toContainEqual({ type: 'text-delta', id: 'item-text', delta: 'Hello ' });
		expect(chunks).toContainEqual({
			type: 'text-delta',
			id: 'item-text',
			delta: 'from the fake app-server.',
		});
		expect(chunks.at(-1)).toEqual({ type: 'finish', finishReason: 'stop' });
		expect(threadRepository.saveRuntimeBinding).toHaveBeenCalledWith(
			THREAD.id,
			{ runtimeKind: 'easycode', runtimeThreadId: 'easycode-thread-1' },
			{},
		);

		await handle.onSettled?.({ status: 'completed', executionId: 'execution-1' });
	}, 30_000);

	it('closes the child process when a turn is cancelled before it completes', async () => {
		const threadRepository = mock<AgentExecutionThreadRepository>();
		threadRepository.findRuntimeBinding.mockResolvedValue(null);
		const factory = new EasycodeSupervisorFactoryService(noopLogger);
		const grantsRepository = mock<AgentThreadGrantRepository>();
		grantsRepository.findKeys.mockResolvedValue(new Set());
		const provider = new EasycodeAgentProvider(
			threadRepository,
			{
				create: (options: EasycodeSupervisorCreateOptions) =>
					factory.create({ ...options, exePath: process.execPath, appServerArgs: FIXTURE_ARGS }),
			} as unknown as EasycodeSupervisorFactoryService,
			grantsRepository,
			new EasycodeApprovalRegistry(),
			mock<AgentChatAttachmentService>(),
		);
		const handle = await provider.prepareTurn(startTurn());
		// Start the turn, then settle it as cancelled while the fake app-server
		// still runs it. The interrupt and the shutdown must finish within the
		// 5 s close timeout.
		await handle.agent.stream('say hi', {});

		const started = Date.now();
		await handle.onSettled?.({ status: 'cancelled', executionId: 'execution-1' });

		// Interrupt + shutdown must not hang on the 5 s timeout.
		expect(Date.now() - started).toBeLessThan(5_000);
	}, 30_000);
});
