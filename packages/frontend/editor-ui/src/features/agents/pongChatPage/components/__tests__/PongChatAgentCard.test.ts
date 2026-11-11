/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18nInstance } from '@pong/i18n';
import type { AgentChatListItem } from '@pong/api-types';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_PONG_CHAT_VIEW } from '../../../constants';
import PongChatAgentCard from '../PongChatAgentCard.vue';

const trackSelectedPongChatAgentMock = vi.fn();
vi.mock('../../../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSelectedPongChatAgent: trackSelectedPongChatAgentMock }),
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

const agent: AgentChatListItem = {
	id: 'agent-1',
	name: 'Support Agent',
	description: 'Answers billing questions for the whole team, in great detail.',
	project: { id: 'project-1', name: 'Marketing' },
	attachments: { image: false, pdf: false, audio: false },
	availableInChat: true,
};

function renderCard(props: Partial<InstanceType<typeof PongChatAgentCard>['$props']> = {}) {
	return mount(PongChatAgentCard, {
		props: { agent, source: 'card', ...props },
		global: { plugins: [router, i18nInstance] },
	});
}

describe('PongChatAgentCard', () => {
	beforeEach(() => {
		trackSelectedPongChatAgentMock.mockClear();
	});

	it('renders pong Assistant for a null agent, linking to the Assistant page without telemetry', async () => {
		const wrapper = renderCard({ agent: null });
		await router.isReady();

		expect(wrapper.get('a').attributes('href')).toBe('/assistant');
		expect(wrapper.get('[data-test-id="pong-chat-agent-card-name"]').text()).toBe('pong Assistant');
		expect(wrapper.get('[data-test-id="pong-chat-agent-card-description"]').text()).toBe(
			'Turns plain language into working workflows and agents.',
		);

		await wrapper.get('a').trigger('click');
		expect(trackSelectedPongChatAgentMock).not.toHaveBeenCalled();
	});

	it('links to the agent pong Chat view', async () => {
		const wrapper = renderCard();
		await router.isReady();

		expect(wrapper.get('a').attributes('href')).toBe('/assistant/agents/agent-1');
	});

	it('renders the name and description', () => {
		const wrapper = renderCard();

		expect(wrapper.text()).toContain('Support Agent');
		expect(wrapper.text()).toContain('Answers billing questions');
	});

	it('renders the name as bold text rather than a heading, so the library page stays at one h1', () => {
		const wrapper = renderCard();

		const name = wrapper.get('[data-test-id="pong-chat-agent-card-name"]');
		expect(name.element.tagName.toLowerCase()).not.toMatch(/^h[1-6]$/);
	});

	it('omits the description when the agent has none', () => {
		const wrapper = renderCard({ agent: { ...agent, description: undefined } });

		expect(wrapper.find('[data-test-id="pong-chat-agent-card-description"]').exists()).toBe(false);
	});

	it('tracks selection with the given source on click', async () => {
		const wrapper = renderCard({ source: 'library' });

		await wrapper.get('a').trigger('click');

		expect(trackSelectedPongChatAgentMock).toHaveBeenCalledWith({
			agentId: 'agent-1',
			source: 'library',
		});
	});

	it('renders an agent not in pong Chat without a link, offering to make it available', async () => {
		const unavailable = { ...agent, availableInChat: false };
		const wrapper = renderCard({ agent: unavailable });

		expect(wrapper.find('a').exists()).toBe(false);
		await wrapper.get('[data-test-id="pong-chat-agent-card-make-available"]').trigger('click');

		expect(wrapper.emitted('make-available')).toEqual([[unavailable]]);
		expect(trackSelectedPongChatAgentMock).not.toHaveBeenCalled();
	});
});
