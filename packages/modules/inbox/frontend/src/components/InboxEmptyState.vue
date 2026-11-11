<script setup lang="ts">
import { PongEmptyState, PongLoading, type EmptyStateIconCards } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useInboxStore } from '../inbox.store';

const store = useInboxStore();
const {
	activeTab,
	hasItems,
	loading,
	initialLoadFailed,
	partial,
	isEmpty,
	openCount,
	closedCount,
} = storeToRefs(store);
const i18n = useI18n();
const alertIcon = { type: 'icon', value: 'circle-alert' } as const;
const inboxIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'inbox',
	sides: ['file-diff', 'git-branch', 'circle-check', 'list', 'message-square'],
};
const noSelectionHeading = computed(() => {
	const count = activeTab.value === 'closed' ? closedCount.value : openCount.value;
	if (count === null) return i18n.baseText(`inbox.items.${activeTab.value}`);
	return i18n.baseText(`inbox.noSelection.title.${activeTab.value}`, {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});
</script>

<template>
	<PongLoading v-if="loading" :loading="true" :rows="3" />
	<div v-else :class="$style.emptyStateWrapper">
		<PongEmptyState
			v-if="initialLoadFailed && !hasItems"
			:class="$style.emptyState"
			:icon="alertIcon"
			:heading="i18n.baseText('workflowReviews.error.load')"
			:button-text="i18n.baseText('generic.retry')"
			@click:button="store.fetchActiveTab()"
		/>
		<PongEmptyState
			v-else-if="partial && !hasItems"
			:class="$style.emptyState"
			:icon="alertIcon"
			:heading="i18n.baseText('inbox.partial')"
			:button-text="i18n.baseText('generic.retry')"
			@click:button="store.refreshListAndSummary()"
		/>
		<PongEmptyState
			v-else-if="isEmpty"
			:class="$style.emptyState"
			:icon="inboxIcon"
			:heading="i18n.baseText(activeTab === 'open' ? 'inbox.empty.open' : 'inbox.empty.closed')"
			:description="i18n.baseText(`inbox.empty.body.${activeTab}`)"
			data-test-id="inbox-empty"
		/>
		<PongEmptyState
			v-else-if="hasItems"
			:class="$style.emptyState"
			:icon="inboxIcon"
			:heading="noSelectionHeading"
			:description="i18n.baseText('inbox.noSelection.body')"
		/>
	</div>
</template>

<style lang="scss" module>
.emptyStateWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.emptyStateWrapper .emptyState {
	border: none;
	padding: 0;
}
</style>
