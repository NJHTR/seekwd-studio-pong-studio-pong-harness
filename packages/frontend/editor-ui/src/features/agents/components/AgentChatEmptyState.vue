<script setup lang="ts">
import { PongText } from '@pong/design-system';

import type { AgentJsonConfig } from '../types';
import AgentPersonalisationIcon from './AgentPersonalisationIcon.vue';
import { useI18n } from '@pong/i18n';

const i18n = useI18n();

defineProps<{
	agentConfig: AgentJsonConfig | null;
}>();
</script>

<template>
	<div :class="$style.emptyState">
		<AgentPersonalisationIcon
			:personalisation="agentConfig?.personalisation"
			:class="$style.icon"
			:size="64"
		/>
		<PongText tag="h3" step="xl" bold>{{ agentConfig?.name }}</PongText>
		<PongText step="sm" color="text-light">
			{{ i18n.baseText('agents.chat.emptyState.description') }}
		</PongText>
	</div>
</template>

<style module lang="scss">
@use '@pong/design-system/css/mixins/motion';

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	gap: var(--spacing--3xs);

	> * {
		@include motion.fade-in-up;
		animation-fill-mode: backwards;
	}

	> :nth-child(2) {
		animation-delay: 0.2s;
	}

	> :nth-child(3) {
		animation-delay: 0.4s;
	}
}

.icon {
	margin-bottom: var(--spacing--3xs);
}
</style>
