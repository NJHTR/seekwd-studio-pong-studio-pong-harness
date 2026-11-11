<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { AGENT_PONG_CHAT_LIBRARY_VIEW } from '../../constants';
import { usePongChatAgents } from '../composables/usePongChatAgents';
import PongChatAgentGrid from './PongChatAgentGrid.vue';

// Only the top agents by usage, enough for one two-column row of 6 — "View all"
// below links to the full, searchable library for the rest.
const PAGE_SIZE = 6;

const i18n = useI18n();

const { agents, count, isLoading, loadFailed, retry } = usePongChatAgents({
	query: '',
	page: 1,
	pageSize: PAGE_SIZE,
});

const showViewAll = computed(() => count.value > PAGE_SIZE);
// Stays mounted through loading (skeletons), hides once loading ends with
// nothing to show — no agents at all, or the request failed.
const showSection = computed(
	() => !loadFailed.value && (isLoading.value || agents.value.length > 0),
);
</script>

<template>
	<div v-if="showSection" :class="$style.section" data-test-id="pong-chat-agent-section">
		<div :class="$style.header">
			<PongText tag="h2" size="large" bold>
				{{ i18n.baseText('agents.pongChatPage.chooseAgent') }}
			</PongText>
			<RouterLink
				v-if="showViewAll"
				:to="{ name: AGENT_PONG_CHAT_LIBRARY_VIEW }"
				:class="$style.viewAll"
				data-test-id="pong-chat-agent-section-view-all"
			>
				{{ i18n.baseText('agents.pongChatPage.viewAllAgents') }}
				<PongIcon icon="chevron-right" size="small" />
			</RouterLink>
		</div>

		<PongChatAgentGrid
			:agents="agents"
			:loading="isLoading"
			source="card"
			@agent-made-available="retry"
		/>
	</div>
</template>

<style lang="scss" module>
.section {
	width: 100%;
	max-width: 680px;
	margin-top: var(--spacing--2xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.viewAll {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtle);
	text-decoration: none;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
