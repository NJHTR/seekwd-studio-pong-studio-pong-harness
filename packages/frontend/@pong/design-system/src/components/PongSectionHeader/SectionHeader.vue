<script setup lang="ts">
import PongText from '../PongText';

export interface Props {
	/**
	 * The title/label for the section
	 */
	title: string;
	/**
	 * Whether to show a bottom border
	 */
	bordered?: boolean;
}

withDefaults(defineProps<Props>(), {
	bordered: false,
});
</script>

<template>
	<div :class="[$style.header, { [$style.bordered]: bordered }]">
		<PongText
			:class="$style.title"
			size="small"
			weight="bold"
			color="text-dark"
			data-test-id="section-header-title"
		>
			{{ title }}
		</PongText>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 26px;
	padding-bottom: var(--spacing--4xs);
}

.bordered {
	border-bottom: var(--border);
}

.title {
	flex: 0 0 auto;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
	padding-left: var(--spacing--xs);

	// Style all buttons and action toggles to have consistent icon colors
	:global(.pong-icon-button),
	:global(.action-toggle) {
		color: var(--color--text--shade-1);

		&:hover {
			color: var(--color--primary);
		}
	}
}
</style>
