import { randomUUID } from 'node:crypto';

import type { AgentExecutionStatus } from '@pong/api-types';
import { createTeamProject, linkUserToProject, testModules } from '@pong/backend-test-utils';
import { Container } from '@pong/di';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';

import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });
const chatIntegration = { type: 'pong_chat', credentialId: '' } as const;

// These routes go through the controller registry, so they also check the handler signatures.
describe('pong Chat page HTTP routes', () => {
	async function createPublishedAgent(
		projectId: string,
		{
			withChat = true,
			model = 'anthropic/claude-sonnet-4-5',
			name = 'Support agent',
			subAgents,
		}: {
			withChat?: boolean;
			model?: string;
			name?: string;
			subAgents?: Array<{ agentId: string; enabled?: boolean }>;
		} = {},
	) {
		const agentRepository = Container.get(AgentRepository);
		const agent = await agentRepository.save(
			agentRepository.create({
				id: randomUUID(),
				name,
				projectId,
				schema: { name, model, instructions: 'Help' },
				integrations: [chatIntegration],
				tools: {},
				versionId: randomUUID(),
			}),
		);
		const versionId = randomUUID();
		await Container.get(AgentHistoryRepository).saveVersion(
			{
				versionId,
				agentId: agent.id,
				schema: {
					name,
					description: 'Answers support questions',
					model,
					instructions: 'Help',
					integrations: withChat ? [chatIntegration] : [],
					...(subAgents ? { subAgents: { agents: subAgents } } : {}),
				},
				tools: {},
				publishedBy: 'test',
			},
			{},
		);
		await agentRepository.update({ id: agent.id }, { activeVersionId: versionId });
		return agent;
	}

	async function createPongChatThread(
		agentId: string,
		projectId: string,
		ownerId: string,
		title: string | null = 'My chat',
		{
			source = 'pong_chat_production',
			status = 'success',
		}: { source?: string; status?: AgentExecutionStatus } = {},
	) {
		const threadRepository = Container.get(AgentExecutionThreadRepository);
		const thread = await threadRepository.save(
			threadRepository.create({
				id: randomUUID(),
				agentId,
				agentName: 'Support agent',
				projectId,
				accessScope: 'user',
				ownerId,
				title,
				sessionNumber: 1,
			}),
		);
		const executionRepository = Container.get(AgentExecutionRepository);
		await executionRepository.save(
			executionRepository.create({
				id: randomUUID(),
				threadId: thread.id,
				status,
				userMessage: 'Hello',
				source,
			}),
		);
		return thread;
	}

	async function setup() {
		const owner = await createOwner();
		const chatUser = await createMember();
		const project = await createTeamProject('Support', owner);
		await linkUserToProject(chatUser, project, 'project:chatUser');
		const agent = await createPublishedAgent(project.id);
		return { owner, chatUser, project, agent };
	}

	it('returns one reachable agent in the chat list shape, plus attachments and sub-agents', async () => {
		const { chatUser, project, agent } = await setup();

		const response = await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/pong-chat/agents/${agent.id}`)
			.expect(200);

		expect(response.body.data).toEqual({
			id: agent.id,
			name: 'Support agent',
			description: 'Answers support questions',
			project: { id: project.id, name: 'Support' },
			attachments: { image: true, pdf: true, audio: false },
			availableInChat: true,
			subAgents: [],
		});
	});

	it('resolves sub-agent names for a chat-only member, including disabled entries', async () => {
		const { chatUser, project } = await setup();
		const researcher = await createPublishedAgent(project.id, {
			withChat: false,
			name: 'Researcher',
		});
		const retired = await createPublishedAgent(project.id, { withChat: false, name: 'Retired' });
		const agent = await createPublishedAgent(project.id, {
			subAgents: [{ agentId: researcher.id }, { agentId: retired.id, enabled: false }],
		});

		const response = await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/pong-chat/agents/${agent.id}`)
			.expect(200);

		expect(response.body.data.subAgents).toEqual([
			{ id: researcher.id, name: 'Researcher' },
			{ id: retired.id, name: 'Retired' },
		]);
	});

	it('returns 404 for an agent without the published pong Chat channel', async () => {
		const { chatUser, project } = await setup();
		const agent = await createPublishedAgent(project.id, { withChat: false });

		await server.authAgentFor(chatUser).get(`/agents/v2/pong-chat/agents/${agent.id}`).expect(404);
	});

	it('lists chat agents sorted by usage', async () => {
		const { chatUser, project, agent } = await setup();
		const busierAgent = await createPublishedAgent(project.id);
		await createPongChatThread(agent.id, project.id, chatUser.id);
		await createPongChatThread(busierAgent.id, project.id, chatUser.id);
		await createPongChatThread(busierAgent.id, project.id, chatUser.id);

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2')
			.query({ filter: JSON.stringify({ availableInChat: true }), sortBy: 'usage:desc' })
			.expect(200);

		expect(response.body).toMatchObject({
			count: 2,
			data: [
				{ id: busierAgent.id, attachments: { image: true, pdf: true, audio: false } },
				{ id: agent.id },
			],
		});
		// The list carries attachments (the composer needs them), but sub-agents stay single-agent only.
		expect(response.body.data[0]).not.toHaveProperty('subAgents');
	});

	it('lists agents not in pong Chat yet to a project member who can publish them', async () => {
		const { owner, chatUser, project, agent } = await setup();
		const draft = await createPublishedAgent(project.id, { withChat: false, name: 'Draft' });
		const listFor = async (user: typeof owner) =>
			await server
				.authAgentFor(user)
				.get('/agents/v2')
				.query({ filter: JSON.stringify({ availableInChat: true }) })
				.expect(200);

		// Other tests' agents stay in the database, and the instance owner reaches them all.
		const ownerList = await listFor(owner);
		expect(ownerList.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: agent.id, availableInChat: true }),
				expect.objectContaining({ id: draft.id, availableInChat: false }),
			]),
		);

		const chatUserList = await listFor(chatUser);
		expect(chatUserList.body.data.map(({ id }: { id: string }) => id)).toEqual([agent.id]);
	});

	it("does not list another project's agents not in pong Chat to an instance owner", async () => {
		const owner = await createOwner();
		const member = await createMember();
		const project = await createTeamProject('Elsewhere', member);
		const draft = await createPublishedAgent(project.id, { withChat: false });

		const response = await server
			.authAgentFor(owner)
			.get('/agents/v2')
			.query({ filter: JSON.stringify({ availableInChat: true }) })
			.expect(200);

		expect(response.body.data.map(({ id }: { id: string }) => id)).not.toContain(draft.id);
	});

	it("lists the user's own pong Chat threads", async () => {
		const { owner, chatUser, project, agent } = await setup();
		const thread = await createPongChatThread(agent.id, project.id, chatUser.id);
		await createPongChatThread(agent.id, project.id, owner.id);

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2/pong-chat/threads')
			.expect(200);

		expect(response.body).toMatchObject({
			data: [{ id: thread.id, title: 'My chat', agent: { id: agent.id, projectId: project.id } }],
			nextCursor: null,
		});
	});

	it('narrows the thread list to one agent via the agentId filter', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createPongChatThread(agent.id, project.id, chatUser.id);
		const otherAgent = await createPublishedAgent(project.id);
		await createPongChatThread(otherAgent.id, project.id, chatUser.id);

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2/pong-chat/threads')
			.query({ agentId: agent.id })
			.expect(200);

		expect(response.body).toMatchObject({
			data: [{ id: thread.id, agent: { id: agent.id } }],
			nextCursor: null,
		});
	});

	it('finds a thread by a case-insensitive, partial title search', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createPongChatThread(agent.id, project.id, chatUser.id, 'Refund status');
		await createPongChatThread(agent.id, project.id, chatUser.id, 'Unrelated topic');

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2/pong-chat/threads')
			.query({ search: 'REFUND' })
			.expect(200);

		expect(response.body).toMatchObject({ data: [{ id: thread.id }], nextCursor: null });
	});

	it('returns one of the own pong Chat threads by id', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createPongChatThread(agent.id, project.id, chatUser.id);

		const response = await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/pong-chat/threads/${thread.id}`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: thread.id,
			title: 'My chat',
			agent: { id: agent.id, projectId: project.id },
		});
	});

	it("returns 404 for another user's thread", async () => {
		const { owner, chatUser, project, agent } = await setup();
		const thread = await createPongChatThread(agent.id, project.id, owner.id);

		await server.authAgentFor(chatUser).get(`/agents/v2/pong-chat/threads/${thread.id}`).expect(404);
	});

	it('returns 404 when the thread belongs to an unreachable or unpublished agent', async () => {
		const { chatUser, project } = await setup();
		const unpublishedAgent = await createPublishedAgent(project.id, { withChat: false });
		const thread = await createPongChatThread(unpublishedAgent.id, project.id, chatUser.id);

		await server.authAgentFor(chatUser).get(`/agents/v2/pong-chat/threads/${thread.id}`).expect(404);
	});

	it('returns 404 for an unknown thread id', async () => {
		const { chatUser } = await setup();

		await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/pong-chat/threads/${randomUUID()}`)
			.expect(404);
	});

	it('lets a chat user read the history of their own thread', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createPongChatThread(agent.id, project.id, chatUser.id);

		await server
			.authAgentFor(chatUser)
			.get(`/projects/${project.id}/agents/v2/${agent.id}/pong-chat/${thread.id}/messages`)
			.expect(200);
	});

	describe('deleting an own pong Chat thread', () => {
		it('lets a chat-only member delete their own thread, and it drops from the thread list', async () => {
			const { chatUser, project, agent } = await setup();
			const thread = await createPongChatThread(agent.id, project.id, chatUser.id);

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/pong-chat/${thread.id}`)
				.expect(200, { data: { success: true } });

			const response = await server
				.authAgentFor(chatUser)
				.get('/agents/v2/pong-chat/threads')
				.expect(200);
			expect(response.body.data).toEqual([]);
		});

		it("returns 404 for another user's thread", async () => {
			const { owner, chatUser, project, agent } = await setup();
			const thread = await createPongChatThread(agent.id, project.id, owner.id);

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/pong-chat/${thread.id}`)
				.expect(404);
		});

		it('returns 404 for a preview (non pong-chat) thread', async () => {
			const { chatUser, project, agent } = await setup();
			const thread = await createPongChatThread(agent.id, project.id, chatUser.id, 'Preview chat', {
				source: 'chat',
			});

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/pong-chat/${thread.id}`)
				.expect(404);
		});

		it('returns 409 for a thread with running work', async () => {
			const { chatUser, project, agent } = await setup();
			const thread = await createPongChatThread(agent.id, project.id, chatUser.id, 'Busy chat', {
				status: 'running',
			});

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/pong-chat/${thread.id}`)
				.expect(409);
		});
	});
});
