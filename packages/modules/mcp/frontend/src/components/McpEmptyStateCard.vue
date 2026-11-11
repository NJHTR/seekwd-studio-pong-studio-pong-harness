<script setup lang="ts">
import { PongText } from '@pong/design-system';
import McpClientLogoCards from './McpClientLogoCards.vue';

withDefaults(
	defineProps<{
		title: string;
		description: string;
		dataTestId?: string;
	}>(),
	{ dataTestId: undefined },
);
</script>

<template>
	<div :class="$style.card" :data-test-id="dataTestId">
		<McpClientLogoCards :class="$style.cards" />
		<div :class="$style.copy">
			<PongText bold size="large" color="text-dark">{{ title }}</PongText>
			<PongText size="small" color="text-light">{{ description }}</PongText>
		</div>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/motion';

.card {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xl) var(--spacing--xl);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
	/* Gentle entrance, matching the prototype's empty states. */
	@include motion.fade-in-up;
}

.cards {
	margin-bottom: var(--spacing--sm);
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-width: 32rem;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}
</style>
