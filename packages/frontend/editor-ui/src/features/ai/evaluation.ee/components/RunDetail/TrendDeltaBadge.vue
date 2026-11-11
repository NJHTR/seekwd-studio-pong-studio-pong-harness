<script setup lang="ts">
import { computed } from 'vue';
import type { MetricScale } from '@pong/api-types';
import { PongIcon, PongText } from '@pong/design-system';
import {
	formatMetricDelta,
	getDeltaTone,
	type DeltaTone,
	type MetricCategory,
} from '../../evaluation.utils';

const props = defineProps<{
	delta: number | undefined;
	name: string;
	category?: MetricCategory;
	scale?: MetricScale;
}>();

const tone = computed<DeltaTone>(() => getDeltaTone(props.delta));
const label = computed(() =>
	formatMetricDelta(props.delta, {
		key: props.name,
		category: props.category,
		scale: props.scale,
	}),
);
const icon = computed(() => (tone.value === 'negative' ? 'trending-down' : 'trending-up'));
</script>

<template>
	<span
		v-if="tone !== 'default'"
		:class="[$style.badge, $style[tone]]"
		data-test-id="trend-delta-badge"
	>
		<PongIcon :icon="icon" size="large" />
		<PongText size="small" :class="$style.label">{{ label }}</PongText>
	</span>
</template>

<style module lang="scss">
.badge {
	display: inline-flex;
	align-items: center;
	align-self: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	line-height: 1;
}

.label {
	font-weight: var(--font-weight--medium);
}

.positive {
	background-color: var(--callout--color--background--success);
	color: var(--text-color--success);
}

.negative {
	background-color: var(--callout--color--background--danger);
	color: var(--text-color--danger);
}
</style>
