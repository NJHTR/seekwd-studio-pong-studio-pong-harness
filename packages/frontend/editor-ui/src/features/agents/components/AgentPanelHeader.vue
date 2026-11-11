<script setup lang="ts">
import { PongText, PongVisuallyHidden } from '@pong/design-system';

withDefaults(
	defineProps<{
		title: string;
		description?: string;
		headerId: string;
		headerVisibility?: 'visible' | 'visually-hidden';
	}>(),
	{
		headerVisibility: 'visible',
	},
);
</script>

<template>
	<div
		:class="
			headerVisibility === 'visually-hidden' && !$slots.actions ? $style.headingOnly : $style.row
		"
	>
		<PongVisuallyHidden v-if="headerVisibility === 'visually-hidden'" as-child>
			<h3 :id="headerId">{{ title }}</h3>
		</PongVisuallyHidden>
		<div v-else :class="$style.copy">
			<PongText :id="headerId" tag="h3" step="sm" :bold="true">{{ title }}</PongText>
			<PongText v-if="description" color="text-light">{{ description }}</PongText>
		</div>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<style module lang="scss">
@use '@pong/design-system/css/mixins/motion';

.headingOnly {
	display: contents;
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.copy {
	opacity: var(--agent-panel-header-opacity, 1);
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
	max-width: 80%;

	> span {
		text-wrap: balance;
	}
}

.actions {
	margin-inline-start: auto;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
