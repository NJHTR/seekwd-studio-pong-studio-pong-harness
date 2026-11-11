<script lang="ts" setup>
import { PongButton, PongIcon, PongText } from '@pong/design-system';

defineProps<{
	stepIndex: number;
	totalSteps: number;
	isPrevDisabled?: boolean;
	isNextDisabled?: boolean;
}>();

const emit = defineEmits<{
	prev: [];
	next: [];
}>();
</script>

<template>
	<footer :class="$style.footer">
		<div :class="$style.nav">
			<PongButton
				v-if="totalSteps > 1"
				variant="ghost"
				size="xsmall"
				icon-only
				:disabled="isPrevDisabled"
				data-test-id="wizard-nav-prev"
				aria-label="Previous step"
				@click="emit('prev')"
			>
				<PongIcon icon="chevron-left" size="xsmall" />
			</PongButton>
			<PongText size="small" color="text-light"> {{ stepIndex + 1 }} of {{ totalSteps }} </PongText>
			<PongButton
				v-if="totalSteps > 1"
				variant="ghost"
				size="xsmall"
				icon-only
				:disabled="isNextDisabled"
				data-test-id="wizard-nav-next"
				aria-label="Next step"
				@click="emit('next')"
			>
				<PongIcon icon="chevron-right" size="xsmall" />
			</PongButton>
		</div>
		<div :class="$style.actions">
			<slot name="actions" />
		</div>
	</footer>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.nav {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
