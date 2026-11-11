/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18nInstance } from '@pong/i18n';
import type { AgentChatListItem } from '@pong/api-types';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_PONG_CHAT_VIEW } from '../../../constants';
import SkeletonAgentCard from '@/features/ai/chatHub/components/SkeletonAgentCard.vue';
import PongChatAgentCard from '../PongChatAgentCard.vue';
import PongChatAgentGrid from '../PongChatAgentGrid.vue';

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
		{ path: '/assistant', name: INSTANCE_AI_VIEW, component: stub },
	],
});

const NO_ATTACHMENTS = { image: false, pdf: false, audio: false };
const agents: AgentChatListItem[] = [
	{
		id: 'agent-1',
		name: 'One',
		project: { id: 'p', name: 'P' },
		attachments: NO_ATTACHMENTS,
		availableInChat: true,
	},
	{
		id: 'agent-2',
		name: 'Two',
		project: { id: 'p', name: 'P' },
		attachments: NO_ATTACHMENTS,
		availableInChat: true,
	},
];

function renderGrid(
	props: { agents?: AgentChatListItem[]; loading?: boolean; includeAssistant?: boolean } = {},
) {
	return mount(PongChatAgentGrid, {
		props: { agents, source: 'library', ...props },
		global: { plugins: [router, i18nInstance] },
	});
}

describe('PongChatAgentGrid', () => {
	it('puts an pong Assistant card first with includeAssistant', () => {
		const cards = renderGrid({ includeAssistant: true }).findAllComponents(PongChatAgentCard);

		expect(cards).toHaveLength(3);
		expect(cards[0].props('agent')).toBeNull();
	});

	it('renders one card per agent', () => {
		const wrapper = renderGrid();

		expect(wrapper.findAllComponents(PongChatAgentCard)).toHaveLength(2);
	});

	it('renders skeleton placeholders instead of cards while loading', () => {
		const wrapper = renderGrid({ loading: true });

		expect(wrapper.findAllComponents(PongChatAgentCard)).toHaveLength(0);
		expect(wrapper.findAllComponents(SkeletonAgentCard).length).toBeGreaterThan(0);
	});
});
