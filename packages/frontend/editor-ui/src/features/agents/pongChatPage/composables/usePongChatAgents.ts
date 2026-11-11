import { getCurrentScope, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { AgentChatListItem } from '@pong/api-types';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useRootStore } from '@pong/stores/useRootStore';

import { AGENT_PONG_CHAT_SEARCH_MAX_LENGTH } from '../../constants';
import { listPongChatAgents } from '../../composables/useAgentApi';

export interface UsePongChatAgentsOptions {
	query: MaybeRefOrGetter<string>;
	page: MaybeRefOrGetter<number>;
	pageSize: MaybeRefOrGetter<number>;
}

/**
 * Loads one page of the pong Chat agent library, ranked by the user's own usage.
 * Refetches whenever `query`, `page` or `pageSize` change, and drops a stale response via a
 * request counter (no AbortController hook on `makeRestApiRequest`).
 */
export function usePongChatAgents(options: UsePongChatAgentsOptions) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();

	const agents = ref<AgentChatListItem[]>([]);
	const count = ref(0);
	const isLoading = ref(false);
	const loadFailed = ref(false);

	let requestVersion = 0;
	// Bump the version on unmount, so a response that settles after it is dropped by the
	// existing version guards below instead of mutating state or toasting on the next page.
	if (getCurrentScope()) onScopeDispose(() => requestVersion++);

	async function fetchAgents(): Promise<void> {
		const version = ++requestVersion;
		isLoading.value = true;
		loadFailed.value = false;
		// Caps the query before it reaches the API, which rejects a longer one (backend filter cap).
		const query = toValue(options.query).slice(0, AGENT_PONG_CHAT_SEARCH_MAX_LENGTH);
		const page = toValue(options.page);
		const pageSize = toValue(options.pageSize);
		try {
			const result = await listPongChatAgents(rootStore.restApiContext, {
				query,
				skip: (page - 1) * pageSize,
				take: pageSize,
				sortBy: 'usage:desc',
			});
			if (version !== requestVersion) return;
			agents.value = result.data;
			count.value = result.count;
		} catch (error) {
			if (version !== requestVersion) return;
			agents.value = [];
			count.value = 0;
			loadFailed.value = true;
			toast.showError(error, i18n.baseText('agents.pongChatPage.library.loadError'));
		} finally {
			if (version === requestVersion) isLoading.value = false;
		}
	}

	function retry(): void {
		void fetchAgents();
	}

	watch(
		[() => toValue(options.query), () => toValue(options.page), () => toValue(options.pageSize)],
		() => {
			void fetchAgents();
		},
		{ immediate: true },
	);

	return { agents, count, isLoading, loadFailed, retry };
}
