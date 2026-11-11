/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { mount } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18nInstance } from '@pong/i18n';
import type { AgentChatListItem } from '@pong/api-types';

import { AGENT_PONG_CHAT_LIBRARY_VIEW, AGENT_PONG_CHAT_VIEW } from '../../../constants';
import SkeletonAgentCard from '@/features/ai/chatHub/components/SkeletonAgentCard.vue';
import PongChatAgentCard from '../PongChatAgentCard.vue';
import PongChatAgentGrid from '../PongChatAgentGrid.vue';
import PongChatAgentSection from '../PongChatAgentSection.vue';

const listPongChatAgentsMock = vi.fn();
vi.mock('../../../composables/useAgentApi', () => ({
	listPongChatAgents: (...args: unknown[]) => listPongChatAgentsMock(...args),
}));

vi.mock('@pong/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));

vi.mock('@pong/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('../../../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSelectedPongChatAgent: vi.fn() }),
}));

const stub = { template: '<div />' };
const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/assistant/agents/:agentId/:agentThreadId?',
			name: AGENT_PONG_CHAT_VIEW,
			component: stub,
		},
		{ path: '/assistant/agents', name: AGENT_PONG_CHAT_LIBRARY_VIEW, component: stub },
	],
});

function agent(id: string, name: string): AgentChatListItem {
	return {
		id,
		name,
		project: { id: 'p', name: 'P' },
		attachments: { image: false, pdf: false, audio: false },
		availableInChat: true,
	};
}

function renderSection() {
	return mount(PongChatAgentSection, { global: { plugins: [router, i18nInstance] } });
}

describe('PongChatAgentSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('requests the first 6 agents, ranked by usage', async () => {
		listPongChatAgentsMock.mockResolvedValue({ count: 0, data: [] });

		renderSection();
		await flushPromises();

		expect(listPongChatAgentsMock).toHaveBeenCalledWith(expect.anything(), {
			query: '',
			skip: 0,
			take: 6,
			sortBy: 'usage:desc',
		});
	});

	it('titles the section "Talk to your agents"', () => {
		listPongChatAgentsMock.mockReturnValue(new Promise(() => {}));

		expect(renderSection().text()).toContain('Talk to your agents');
	});

	it('shows skeletons while loading', () => {
		listPongChatAgentsMock.mockReturnValue(new Promise(() => {}));

		const wrapper = renderSection();

		expect(wrapper.find('[data-test-id="pong-chat-agent-section"]').exists()).toBe(true);
		expect(wrapper.findAllComponents(PongChatAgentCard)).toHaveLength(0);
		expect(wrapper.findAllComponents(SkeletonAgentCard)).not.toHaveLength(0);
	});

	it('renders a card per returned agent', async () => {
		listPongChatAgentsMock.mockResolvedValue({
			count: 2,
			data: [agent('a1', 'One'), agent('a2', 'Two')],
		});

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.findAllComponents(PongChatAgentCard)).toHaveLength(2);
	});

	it('hides "View all agents" when the library holds 6 agents or fewer', async () => {
		listPongChatAgentsMock.mockResolvedValue({ count: 6, data: [agent('a1', 'One')] });

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.find('[data-test-id="pong-chat-agent-section-view-all"]').exists()).toBe(false);
	});

	it('shows "View all agents" pointing at the library once there are more than 6', async () => {
		listPongChatAgentsMock.mockResolvedValue({ count: 7, data: [agent('a1', 'One')] });

		const wrapper = renderSection();
		await flushPromises();
		await router.isReady();

		const viewAll = wrapper.get('[data-test-id="pong-chat-agent-section-view-all"]');
		expect(viewAll.attributes('href')).toBe('/assistant/agents');
	});

	it('reloads the list after an agent is made available', async () => {
		listPongChatAgentsMock.mockResolvedValue({ count: 1, data: [agent('a1', 'One')] });

		const wrapper = renderSection();
		await flushPromises();
		listPongChatAgentsMock.mockClear();

		wrapper.findComponent(PongChatAgentGrid).vm.$emit('agent-made-available');
		await flushPromises();

		expect(listPongChatAgentsMock).toHaveBeenCalledOnce();
	});

	it('renders nothing once loading ends with no agents', async () => {
		listPongChatAgentsMock.mockResolvedValue({ count: 0, data: [] });

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.find('[data-test-id="pong-chat-agent-section"]').exists()).toBe(false);
	});

	it('renders nothing when the request fails', async () => {
		listPongChatAgentsMock.mockRejectedValue(new Error('network down'));

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.find('[data-test-id="pong-chat-agent-section"]').exists()).toBe(false);
	});
});
