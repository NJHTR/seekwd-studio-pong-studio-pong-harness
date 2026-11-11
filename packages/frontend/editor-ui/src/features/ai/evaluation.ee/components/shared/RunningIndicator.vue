<script setup lang="ts">
import { PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

// Accent "working" pill for an in-progress run set, distinct from the settled
// Done/Failed badges. Shared by the compare header and list card for one treatment.
defineProps<{
	completed: number;
	total: number;
}>();

const i18n = useI18n();
</script>

<template>
	<span :class="$style.indicator" data-test-id="eval-running-indicator">
		<PongIcon icon="spinner" size="xsmall" spin />
		<PongText size="xsmall" :bold="true" :compact="true">
			{{
				i18n.baseText('evaluation.collections.card.runningProgress', {
					interpolate: { completed, total },
				})
			}}
		</PongText>
	</span>
</template>

<style module lang="scss">
.indicator {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--xl);
	color: var(--color--secondary);
	background-color: var(--color--secondary--tint-1);
	white-space: nowrap;
}
</style>
