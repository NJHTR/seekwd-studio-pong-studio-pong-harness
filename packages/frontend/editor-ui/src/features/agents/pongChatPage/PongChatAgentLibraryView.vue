<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { PongEmptyState, PongIcon, PongInput, PongPagination, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { getDebounceTime } from '@pong/composables/useDebounce';

import { DEBOUNCE_TIME, DEFAULT_WORKFLOW_PAGE_SIZE } from '@/app/constants';
import { AGENT_PONG_CHAT_SEARCH_MAX_LENGTH } from '../constants';
import { useAgentsPongChatVariant } from '../composables/useAgentsPongChatFlag';
import { usePongChatAgents } from './composables/usePongChatAgents';
import PongChatAgentGrid from './components/PongChatAgentGrid.vue';
import PongChatPageLayout from './components/PongChatPageLayout.vue';

const i18n = useI18n();

const searchInput = ref('');
const query = ref('');
const page = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
// Same choices as the other pong lists (`ResourcesListLayout`).
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const { agents, count, isLoading, loadFailed, retry } = usePongChatAgents({ query, page, pageSize });

const onSearch = useDebounceFn((value: string) => {
	const trimmed = value.trim();
	if (trimmed === query.value) return;
	query.value = trimmed;
	page.value = 1;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

function onSearchInput(value: string): void {
	searchInput.value = value;
	void onSearch(value);
}

const hasSearch = computed(() => query.value.length > 0);
const showPagination = computed(() => count.value > 0);

// Variant B lists the pong Assistant as a chat option too, at the top of the unfiltered list.
const { isVariantB } = useAgentsPongChatVariant();
const includeAssistant = computed(() => isVariantB.value && !hasSearch.value && page.value === 1);
// With the Assistant card there is always something to pick, so no empty state.
const showEmptyState = computed(
	() => !includeAssistant.value && !isLoading.value && !loadFailed.value && count.value === 0,
);

function onPageSizeChange(size: number): void {
	pageSize.value = size;
	page.value = 1;
}
</script>

<template>
	<PongChatPageLayout>
		<PongText tag="h1" size="xlarge" bold>
			{{ i18n.baseText('agents.pongChatPage.library.title') }}
		</PongText>

		<PongInput
			:model-value="searchInput"
			:placeholder="i18n.baseText('agents.pongChatPage.library.search.placeholder')"
			:maxlength="AGENT_PONG_CHAT_SEARCH_MAX_LENGTH"
			size="medium"
			clearable
			data-testid="pong-chat-library-search"
			@update:model-value="onSearchInput"
		>
			<template #prefix>
				<PongIcon icon="search" />
			</template>
		</PongInput>

		<PongEmptyState
			v-if="showEmptyState"
			data-testid="pong-chat-library-empty"
			:icon="{ type: 'icon', value: 'bot' }"
			:heading="
				hasSearch
					? i18n.baseText('agents.pongChatPage.library.empty.noResults.title')
					: i18n.baseText('agents.pongChatPage.library.empty.noAgents.title')
			"
		/>
		<template v-else>
			<!-- A failed agent load must not hide the Assistant card: it's always a
			valid pick, independent of whether the agent list loaded. -->
			<PongChatAgentGrid
				v-if="!loadFailed || includeAssistant"
				:agents="loadFailed ? [] : agents"
				:loading="!loadFailed && isLoading"
				:include-assistant="includeAssistant"
				source="library"
				@agent-made-available="retry"
			/>
			<PongEmptyState
				v-if="loadFailed"
				data-testid="pong-chat-library-error"
				:icon="{ type: 'icon', value: 'circle-alert' }"
				:heading="i18n.baseText('agents.pongChatPage.library.loadFailed.title')"
				:button-text="i18n.baseText('generic.retry')"
				@click:button="retry"
			/>
		</template>

		<PongPagination
			v-if="showPagination"
			v-model:page="page"
			:class="$style.pagination"
			:items-per-page="pageSize"
			:total="count"
			:page-sizes="PAGE_SIZE_OPTIONS"
			data-test-id="pong-chat-agent-library-pagination"
			@update:items-per-page="onPageSizeChange"
		/>
	</PongChatPageLayout>
</template>

<style lang="scss" module>
.pagination {
	align-self: flex-end;
}
</style>
