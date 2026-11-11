<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import { PongIcon, PongText } from '@pong/design-system';
import { formatTimelineTime } from '../../utils/timeline-time';
import { executionErrorLabel, executionErrorMessage } from '../../session-timeline.utils';

import type { TimelineItem } from '../../session-timeline.types';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
}>();

const i18n = useI18n();
const time = computed(() => formatTimelineTime(props.item.timestamp));
</script>

<template>
	<div :class="$style.row">
		<span :class="$style.iconContainer">
			<PongIcon icon="circle-alert" color="danger" size="medium" />
		</span>
		<PongText step="xs" bold color="danger">
			{{ executionErrorLabel(item, i18n) }}: {{ executionErrorMessage(item, i18n) }}
		</PongText>
		<PongText step="xs" color="text-light" bold :class="$style.timestamp">{{ time }}</PongText>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-inline: var(--spacing--2xs);
	padding-inline: var(--spacing--2xs);
	padding-inline-end: var(--spacing--2xs);
}
.iconContainer {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
	border-radius: var(--radius);
}
.timestamp {
	margin-inline-start: auto;
	text-align: right;
	font-variant-numeric: tabular-nums;
}
</style>
