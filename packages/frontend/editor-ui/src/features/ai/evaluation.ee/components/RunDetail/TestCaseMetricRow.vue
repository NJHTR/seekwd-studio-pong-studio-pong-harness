<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import type { MetricScale } from '@pong/api-types';
import { PongIcon, PongText, PongTooltip } from '@pong/design-system';
import {
	formatMetricLabel,
	formatMetricValue,
	formatMetricRawScore,
	type MetricCategory,
} from '../../evaluation.utils';

const props = defineProps<{
	name: string;
	value: number | undefined;
	category?: MetricCategory;
	scale?: MetricScale;
	sourceNodeName?: string;
	errored?: boolean;
	errorMessage?: string;
}>();

const locale = useI18n();

const formattedLabel = computed(() => formatMetricLabel(props.name));
const formattedValue = computed(() =>
	formatMetricValue(props.value, {
		key: props.name,
		category: props.category,
		scale: props.scale,
	}),
);
const formattedRawScore = computed(() =>
	formatMetricRawScore(props.value, { category: props.category, scale: props.scale }),
);
const tooltipContent = computed(() =>
	formattedRawScore.value ? `${formattedValue.value} • ${formattedRawScore.value}` : '',
);
</script>

<template>
	<div :class="$style.row" data-test-id="test-case-metric-row">
		<div :class="$style.leading">
			<PongIcon
				:icon="errored ? 'circle-x' : 'circle-check'"
				size="small"
				:class="errored ? $style.errorIcon : $style.successIcon"
			/>
			<PongText size="medium" bold :class="$style.name">{{ formattedLabel }}</PongText>
			<PongText v-if="sourceNodeName" size="small" :class="$style.subtitle">
				{{ sourceNodeName }}
			</PongText>
		</div>
		<div :class="$style.trailing">
			<PongText v-if="errored" size="small" :class="$style.errorMessage">
				{{ errorMessage ?? locale.baseText('evaluation.runDetail.testCase.failed') }}
			</PongText>
			<PongTooltip v-else-if="tooltipContent" :content="tooltipContent" placement="top">
				<PongText size="medium" :class="$style.value">{{ formattedValue }}</PongText>
			</PongTooltip>
			<PongText v-else size="medium" :class="$style.value">{{ formattedValue }}</PongText>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) 0;
	min-height: 32px;
}

.leading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1 1 auto;
}

.trailing {
	display: flex;
	align-items: center;
	flex: 0 0 auto;
}

.successIcon {
	color: var(--icon-color--success);
}

.errorIcon {
	color: var(--icon-color--danger);
}

.name {
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.subtitle {
	color: var(--color--text--tint-1);
}

.value {
	font-variant-numeric: tabular-nums;
	color: var(--color--text);
	font-weight: var(--font-weight--medium);
}

.errorMessage {
	color: var(--text-color--danger);
}
</style>
