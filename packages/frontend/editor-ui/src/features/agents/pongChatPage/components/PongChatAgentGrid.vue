<script setup lang="ts">
import { ref } from 'vue';
import type { AgentChatListItem } from '@pong/api-types';

import type { PongChatAgentSource } from '../../composables/useAgentTelemetry';
import SkeletonAgentCard from '@/features/ai/chatHub/components/SkeletonAgentCard.vue';
import PongChatAgentCard from './PongChatAgentCard.vue';
import PongChatMakeAvailableModal from './PongChatMakeAvailableModal.vue';

withDefaults(
	defineProps<{
		agents: AgentChatListItem[];
		loading?: boolean;
		source: PongChatAgentSource;
		/** Puts an pong Assistant card before the agents. */
		includeAssistant?: boolean;
	}>(),
	{ loading: false, includeAssistant: false },
);

const emit = defineEmits<{
	'agent-made-available': [];
}>();

const SKELETON_CARD_COUNT = 6;

const agentToMakeAvailable = ref<AgentChatListItem | null>(null);

function onAvailable(): void {
	agentToMakeAvailable.value = null;
	emit('agent-made-available');
}
</script>

<template>
	<div :class="$style.grid" data-test-id="pong-chat-agent-grid">
		<template v-if="loading">
			<SkeletonAgentCard
				v-for="i in SKELETON_CARD_COUNT"
				:key="i"
				:show-action-button="false"
				:class="$style.skeletonCard"
			/>
		</template>
		<template v-else>
			<PongChatAgentCard v-if="includeAssistant" :agent="null" :source="source" />
			<PongChatAgentCard
				v-for="agent in agents"
				:key="agent.id"
				:agent="agent"
				:source="source"
				@make-available="agentToMakeAvailable = $event"
			/>
		</template>
		<PongChatMakeAvailableModal
			v-if="agentToMakeAvailable"
			:agent="agentToMakeAvailable"
			@close="agentToMakeAvailable = null"
			@available="onAvailable"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/breakpoints';

.grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing--sm);
}

@include breakpoints.breakpoint('sm-and-down') {
	.grid {
		grid-template-columns: 1fr;
	}
}

// Matches `PongChatAgentCard`'s 40px `AgentPersonalisationIcon`, bigger than
// chatHub's own 24px skeleton avatar.
.skeletonCard {
	--skeleton-agent-card-avatar-size: 40px;
}
</style>
