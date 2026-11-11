import { computed, ref, type Ref } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import type { AgentChatListItem } from '@pong/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import PongChatAgentPicker from '../PongChatAgentPicker.vue';

type Options = { query: Ref<string>; page: Ref<number>; pageSize: Ref<number> };

const usePongChatAgentsMock = vi.fn();
vi.mock('../../composables/usePongChatAgents', () => ({
	usePongChatAgents: (options: Options) => usePongChatAgentsMock(options),
}));

const trackSelectedPongChatAgentMock = vi.fn();
vi.mock('../../../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSelectedPongChatAgent: trackSelectedPongChatAgentMock }),
}));

const canCreateState = { value: true };
vi.mock('../../../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canCreate: computed(() => canCreateState.value) }),
}));

const createAgentMock = vi.fn();
vi.mock('../../../composables/useCreateAgent', () => ({
	useCreateAgent: () => ({ createAgent: createAgentMock }),
}));

const connectIntegrationMock = vi.fn();
const publishAgentMock = vi.fn();
vi.mock('../../../composables/useAgentApi', () => ({
	connectIntegration: (...args: unknown[]) => connectIntegrationMock(...args),
	publishAgent: (...args: unknown[]) => publishAgentMock(...args),
}));

const pushMock = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({ push: pushMock }),
	useRoute: () => ({ params: {}, query: {} }),
}));

function agent(id: string, name: string, description?: string): AgentChatListItem {
	return {
		id,
		name,
		description,
		project: { id: 'project-1', name: 'Project' },
		attachments: { image: false, pdf: false, audio: false },
		availableInChat: true,
	};
}

function setup(
	result: { agents: AgentChatListItem[]; count: number; isLoading?: boolean },
	props: {
		modelValue: AgentChatListItem | null;
		projectId?: string;
		disabled?: boolean;
	} = { modelValue: null },
) {
	const retry = vi.fn();
	usePongChatAgentsMock.mockReturnValue({
		agents: ref(result.agents),
		count: ref(result.count),
		isLoading: ref(result.isLoading ?? false),
		loadFailed: ref(false),
		retry,
	});

	const renderComponent = createComponentRenderer(PongChatAgentPicker);
	return { ...renderComponent({ props, pinia: createTestingPinia() }), retry };
}

describe('PongChatAgentPicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		canCreateState.value = true;
	});

	it('renders the heading as one translated phrase with the picker in its agent slot', () => {
		const { getByTestId } = setup({ agents: [], count: 0 });

		const heading = getByTestId('pong-chat-agent-picker-heading');
		expect(heading).toHaveTextContent(/^Chat with\s*pong Assistant$/);
		expect(heading).toContainElement(getByTestId('pong-chat-agent-picker-trigger'));
	});

	it('shows pong Assistant as the selection by default', () => {
		const { getByTestId } = setup({ agents: [], count: 0 });

		expect(getByTestId('pong-chat-agent-picker-trigger')).toHaveTextContent('pong Assistant');
		expect(getByTestId('pong-chat-agent-picker-subtitle')).toHaveTextContent(
			'Turns plain language into working workflows and agents.',
		);
	});

	it('shows no subtitle for a selected agent without a description', () => {
		const selected = agent('a1', 'Support Agent');
		const { queryByTestId } = setup({ agents: [selected], count: 1 }, { modelValue: selected });

		expect(queryByTestId('pong-chat-agent-picker-subtitle')).not.toBeInTheDocument();
	});

	it('shows the selected agent instead of the Assistant', () => {
		const selected = agent('a1', 'Support Agent', 'Answers billing questions');
		const { getByTestId } = setup({ agents: [selected], count: 1 }, { modelValue: selected });

		expect(getByTestId('pong-chat-agent-picker-trigger')).toHaveTextContent('Support Agent');
		expect(getByTestId('pong-chat-agent-picker-subtitle')).toHaveTextContent(
			'Answers billing questions',
		);
	});

	it('lists agents from the library in the dropdown', async () => {
		const { getByTestId, findByTestId } = setup({
			agents: [agent('a1', 'Support Agent', 'Answers billing questions')],
			count: 1,
		});

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));

		const item = await findByTestId('pong-chat-agent-picker-item-a1');
		expect(item).toHaveTextContent('Support Agent');
		expect(item).toHaveTextContent('Answers billing questions');
	});

	it('hides the Assistant row once the search no longer matches its name', async () => {
		const { getByTestId, findByTestId, queryByTestId, getByPlaceholderText } = setup({
			agents: [agent('a1', 'Support Agent')],
			count: 1,
		});

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		expect(await findByTestId('pong-chat-agent-picker-item-assistant')).toBeInTheDocument();

		await userEvent.type(getByPlaceholderText('Search agents...'), 'support');

		await waitFor(() => {
			expect(queryByTestId('pong-chat-agent-picker-item-assistant')).not.toBeInTheDocument();
		});
		expect(getByTestId('pong-chat-agent-picker-item-a1')).toBeInTheDocument();
	});

	it('emits the selected agent and tracks the selection on click', async () => {
		const testAgent = agent('a1', 'Support Agent');
		const { getByTestId, findByTestId, emitted } = setup({ agents: [testAgent], count: 1 });

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		await userEvent.click(await findByTestId('pong-chat-agent-picker-item-a1'));

		expect(emitted()['update:modelValue']?.[0]).toEqual([testAgent]);
		expect(trackSelectedPongChatAgentMock).toHaveBeenCalledWith({
			agentId: 'a1',
			source: 'dropdown',
		});
	});

	it('emits null and tracks nothing when the Assistant is selected', async () => {
		const selected = agent('a1', 'Support Agent');
		const { getByTestId, findByTestId, emitted } = setup(
			{ agents: [selected], count: 1 },
			{ modelValue: selected },
		);

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		await userEvent.click(await findByTestId('pong-chat-agent-picker-item-assistant'));

		expect(emitted()['update:modelValue']?.[0]).toEqual([null]);
		expect(trackSelectedPongChatAgentMock).not.toHaveBeenCalled();
	});

	it('hides "View all agents" with 10 or fewer agents', async () => {
		canCreateState.value = false;
		const { getByTestId, findByTestId, queryByTestId } = setup({ agents: [], count: 10 });

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		await findByTestId('pong-chat-agent-picker-menu');

		expect(queryByTestId('pong-chat-agent-picker-view-all')).not.toBeInTheDocument();
	});

	it('shows "View all agents" past 10 agents and navigates to the library', async () => {
		canCreateState.value = false;
		const { getByTestId, findByTestId } = setup({ agents: [], count: 11 });

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		const viewAll = await findByTestId('pong-chat-agent-picker-view-all');
		expect(viewAll.querySelector('[data-icon="chevron-right"]')).not.toBeNull();
		await userEvent.click(viewAll);

		expect(pushMock).toHaveBeenCalledWith({ name: 'AgentPongChatLibraryView' });
	});

	it.each([
		['without create permission', false, 'p1'],
		['without a selected project', true, undefined],
	])('hides "Create new agent" %s', async (_case, canCreate, projectId) => {
		canCreateState.value = canCreate;
		const { getByTestId, findByTestId, queryByTestId } = setup(
			{ agents: [], count: 0 },
			{ modelValue: null, projectId },
		);

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		await findByTestId('pong-chat-agent-picker-menu');

		expect(queryByTestId('pong-chat-agent-picker-create')).not.toBeInTheDocument();
	});

	it('shows "Create new agent" with permission and a project, and creates it there', async () => {
		canCreateState.value = true;
		const { getByTestId, findByTestId } = setup(
			{ agents: [], count: 0 },
			{ modelValue: null, projectId: 'p1' },
		);

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		const createButton = await findByTestId('pong-chat-agent-picker-create');
		// It opens the agent builder, a new page, so it carries the new-page icon.
		expect(createButton.querySelector('[data-icon="external-link"]')).not.toBeNull();
		await userEvent.click(createButton);

		expect(createAgentMock).toHaveBeenCalledWith('dropdown', 'p1');
	});

	it('disables the trigger and blocks opening the menu when disabled', async () => {
		const { getByTestId, queryByTestId } = setup(
			{ agents: [agent('a1', 'Support Agent')], count: 1 },
			{ modelValue: null, disabled: true },
		);

		const trigger = getByTestId('pong-chat-agent-picker-trigger');
		expect(trigger).toBeDisabled();

		await userEvent.click(trigger);

		expect(queryByTestId('pong-chat-agent-picker-menu')).not.toBeInTheDocument();
	});

	it('publishes an agent not in pong Chat to it after confirmation, then selects it', async () => {
		const draft = { ...agent('a1', 'Recruiting screener'), availableInChat: false };
		const { getByTestId, findByTestId, emitted, retry } = setup({ agents: [draft], count: 1 });

		await userEvent.click(getByTestId('pong-chat-agent-picker-trigger'));
		expect(await findByTestId('pong-chat-agent-picker-make-available-a1')).toHaveTextContent(
			'Make available',
		);
		await userEvent.click(getByTestId('pong-chat-agent-picker-item-a1'));

		await userEvent.click(await findByTestId('pong-chat-make-available-confirm'));

		await waitFor(() => {
			expect(emitted('update:modelValue')).toEqual([[{ ...draft, availableInChat: true }]]);
		});
		expect(connectIntegrationMock).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'a1',
			'pong_chat',
			'',
		);
		expect(publishAgentMock).toHaveBeenCalledWith(expect.anything(), 'project-1', 'a1');
		expect(retry).toHaveBeenCalled();
	});
});
