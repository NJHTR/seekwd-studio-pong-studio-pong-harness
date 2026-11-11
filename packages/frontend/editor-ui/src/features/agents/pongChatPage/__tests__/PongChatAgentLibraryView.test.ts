/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { i18nInstance } from '@pong/i18n';
import { PongPagination } from '@pong/design-system';
import type { AgentChatListItem } from '@pong/api-types';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import PongChatAgentLibraryView from '../PongChatAgentLibraryView.vue';
import PongChatAgentGrid from '../components/PongChatAgentGrid.vue';

type Options = { query: Ref<string>; page: Ref<number>; pageSize: Ref<number> };

const usePongChatAgentsMock = vi.fn();
const retryMock = vi.fn();
const isVariantB = { value: false };
vi.mock('../../composables/useAgentsPongChatFlag', async () => {
	const { computed } = await import('vue');
	return {
		useAgentsPongChatVariant: () => ({
			isVariantA: computed(() => false),
			isVariantB: computed(() => isVariantB.value),
		}),
	};
});

vi.mock('../composables/usePongChatAgents', () => ({
	usePongChatAgents: (options: Options) => usePongChatAgentsMock(options),
}));

// A real card needs an installed router (for `RouterLink`) and an active Pinia
// instance (for telemetry) — out of scope for this view-level test, which only
// cares that the grid receives the right agents.
vi.mock('../components/PongChatAgentCard.vue', () => ({
	default: {
		name: 'PongChatAgentCard',
		props: ['agent', 'source'],
		template: '<div data-testid="stub-agent-card">{{ agent?.name ?? \'pong Assistant\' }}</div>',
	},
}));

const pushMock = vi.fn();
const backMock = vi.fn();
const historyBack = { value: undefined as string | undefined };
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: pushMock,
		back: backMock,
		resolve: vi.fn((to: unknown) => ({ href: JSON.stringify(to), matched: [{}] })),
		options: {
			history: {
				get state() {
					return { back: historyBack.value };
				},
			},
		},
	}),
}));

const NO_ATTACHMENTS = { image: false, pdf: false, audio: false };
const agentA: AgentChatListItem = {
	id: 'a1',
	name: 'One',
	project: { id: 'p', name: 'P' },
	attachments: NO_ATTACHMENTS,
	availableInChat: true,
};
const agentB: AgentChatListItem = {
	id: 'a2',
	name: 'Two',
	project: { id: 'p', name: 'P' },
	attachments: NO_ATTACHMENTS,
	availableInChat: true,
};

function setup(result: {
	agents: AgentChatListItem[];
	count: number;
	isLoading: boolean;
	loadFailed?: boolean;
}) {
	usePongChatAgentsMock.mockReturnValue({
		agents: ref(result.agents),
		count: ref(result.count),
		isLoading: ref(result.isLoading),
		loadFailed: ref(result.loadFailed ?? false),
		retry: retryMock,
	});

	return mount(PongChatAgentLibraryView, {
		global: {
			plugins: [i18nInstance],
			stubs: {
				PongInput: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template:
						'<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
				},
			},
		},
	});
}

describe('PongChatAgentLibraryView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		historyBack.value = undefined;
		isVariantB.value = false;
	});

	it('shows the pong Assistant card instead of the empty state for variant B with no agents', () => {
		isVariantB.value = true;
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		expect(wrapper.find('[data-testid="pong-chat-library-empty"]').exists()).toBe(false);
		expect(wrapper.findComponent(PongChatAgentGrid).props('includeAssistant')).toBe(true);
	});

	it('includes the pong Assistant card only for variant B, on the first page without a search', async () => {
		expect(
			setup({ agents: [agentA], count: 1, isLoading: false })
				.findComponent(PongChatAgentGrid)
				.props('includeAssistant'),
		).toBe(false);

		isVariantB.value = true;
		const wrapper = setup({ agents: [agentA], count: 1, isLoading: false });
		const grid = () => wrapper.findComponent(PongChatAgentGrid);
		expect(grid().props('includeAssistant')).toBe(true);

		const options = usePongChatAgentsMock.mock.lastCall?.[0] as Options;
		options.page.value = 2;
		await wrapper.vm.$nextTick();
		expect(grid().props('includeAssistant')).toBe(false);

		options.page.value = 1;
		options.query.value = 'support';
		await wrapper.vm.$nextTick();
		expect(grid().props('includeAssistant')).toBe(false);
	});

	it('renders the title and the agent grid', () => {
		const wrapper = setup({ agents: [agentA, agentB], count: 2, isLoading: false });

		expect(wrapper.text()).toContain('Agents library');
		const grid = wrapper.findComponent(PongChatAgentGrid);
		expect(grid.props('agents')).toEqual([agentA, agentB]);
		expect(grid.props('source')).toBe('library');
	});

	it('caps the search input at 128 characters', () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		expect(wrapper.get('[data-testid="pong-chat-library-search"]').attributes('maxlength')).toBe(
			'128',
		);
	});

	it('shows the no-agents empty state when there is no search and no agents', () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		expect(wrapper.find('[data-testid="pong-chat-library-empty"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('No agents available to chat with yet');
	});

	it('shows a no-results empty state once a search is active and nothing matches', async () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		await wrapper.get('[data-testid="pong-chat-library-search"]').setValue('zzz');
		await vi.waitFor(() => {
			expect(usePongChatAgentsMock.mock.calls[0][0].query.value).toBe('zzz');
		});
		await wrapper.vm.$nextTick();

		expect(wrapper.text()).toContain('No agents match your search');
	});

	it('shows a retryable error state instead of the empty state on a failed fetch', () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false, loadFailed: true });

		expect(wrapper.find('[data-testid="pong-chat-library-error"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="pong-chat-library-empty"]').exists()).toBe(false);
		expect(wrapper.findComponent(PongChatAgentGrid).exists()).toBe(false);
	});

	it('shows the error state even with stale results, and retries on click', async () => {
		const wrapper = setup({ agents: [agentA], count: 1, isLoading: false, loadFailed: true });

		const errorState = wrapper.get('[data-testid="pong-chat-library-error"]');
		expect(wrapper.findComponent(PongChatAgentGrid).exists()).toBe(false);

		await errorState.get('button').trigger('click');
		expect(retryMock).toHaveBeenCalledOnce();
	});

	it('keeps the pong Assistant card next to the error state for variant B on a failed fetch', () => {
		isVariantB.value = true;
		const wrapper = setup({ agents: [], count: 0, isLoading: false, loadFailed: true });

		expect(wrapper.find('[data-testid="pong-chat-library-error"]').exists()).toBe(true);
		const grid = wrapper.findComponent(PongChatAgentGrid);
		expect(grid.exists()).toBe(true);
		expect(grid.props('includeAssistant')).toBe(true);
		expect(grid.props('agents')).toEqual([]);
	});

	it('resets to page 1 once the search query actually changes', async () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });
		const options = usePongChatAgentsMock.mock.calls[0][0] as Options;
		options.page.value = 3;

		await wrapper.get('[data-testid="pong-chat-library-search"]').setValue('support');
		await vi.waitFor(() => {
			expect(options.query.value).toBe('support');
		});

		expect(options.page.value).toBe(1);
	});

	it('keeps the current page when the debounced query is unchanged after trimming', async () => {
		vi.useFakeTimers();
		try {
			const wrapper = setup({ agents: [], count: 0, isLoading: false });
			const options = usePongChatAgentsMock.mock.calls[0][0] as Options;
			const search = wrapper.get('[data-testid="pong-chat-library-search"]');

			await search.setValue('support');
			await vi.advanceTimersByTimeAsync(300);
			expect(options.query.value).toBe('support');

			// Change the page within the debounce window, then let a value that
			// trims to the same query debounce through — the page must not reset.
			options.page.value = 3;
			await search.setValue('  support  ');
			await vi.advanceTimersByTimeAsync(300);

			expect(options.query.value).toBe('support');
			expect(options.page.value).toBe(3);
		} finally {
			vi.useRealTimers();
		}
	});

	it('shows pagination with a total and page sizes once there are agents', () => {
		const empty = setup({ agents: [], count: 0, isLoading: false });
		expect(empty.findComponent(PongPagination).exists()).toBe(false);

		const pagination = setup({ agents: [agentA], count: 1, isLoading: false }).findComponent(
			PongPagination,
		);
		expect(pagination.exists()).toBe(true);
		expect(pagination.props('pageSizes')).toEqual([10, 25, 50, 100]);
		expect(pagination.props('itemsPerPage')).toBe(50);
	});

	it('goes back to the first page when the page size changes', async () => {
		const wrapper = setup({ agents: [agentA], count: 120, isLoading: false });
		const options = usePongChatAgentsMock.mock.lastCall?.[0] as Options;
		options.page.value = 3;

		wrapper.findComponent(PongPagination).vm.$emit('update:itemsPerPage', 25);
		await wrapper.vm.$nextTick();

		expect(options.pageSize.value).toBe(25);
		expect(options.page.value).toBe(1);
	});

	it('goes to the pong Assistant page, not back in history, even with in-app history', async () => {
		historyBack.value = '/some/previous/route';
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		await wrapper.get('[data-testid="pong-chat-back"]').trigger('click');
		expect(pushMock).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW });
		expect(backMock).not.toHaveBeenCalled();
	});
});
