<script setup lang="ts">
import type { ITaskData } from 'pong-workflow';
import { convertToDisplayDateComponents } from '@/app/utils/formatters/dateFormatter';
import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import { PongInfoTip, PongText } from '@pong/design-system';
const i18n = useI18n();

const props = defineProps<{
	taskData: ITaskData | null;
	hasStaleData?: boolean;
	hasPinData?: boolean;
}>();

const runTaskData = computed(() => {
	return props.taskData;
});

const theme = computed(() => {
	return props.taskData?.error ? 'danger' : 'success';
});

const runMetadata = computed(() => {
	if (!runTaskData.value) {
		return null;
	}
	const { date, time } = convertToDisplayDateComponents(runTaskData.value.startTime);
	return {
		executionTime: runTaskData.value.executionTime,
		startTime: `${date} at ${time}`,
	};
});
</script>

<template>
	<PongInfoTip
		v-if="hasStaleData"
		theme="warning-light"
		type="tooltip"
		tooltip-placement="right"
		data-test-id="node-run-info-stale"
	>
		<span
			v-pong-html="
				i18n.baseText(
					hasPinData
						? 'ndv.output.staleDataWarning.pinData'
						: 'ndv.output.staleDataWarning.regular',
				)
			"
		></span>
	</PongInfoTip>
	<div v-else-if="runMetadata" :class="$style.tooltipRow">
		<PongInfoTip
			v-if="taskData?.executionStatus !== 'canceled'"
			type="note"
			:theme="theme"
			:data-test-id="`node-run-status-${theme}`"
			size="large"
		/>
		<PongInfoTip
			type="tooltip"
			theme="info"
			:data-test-id="`node-run-info`"
			tooltip-placement="right"
		>
			<div>
				<PongText :bold="true" size="small"
					>{{
						runTaskData?.error
							? i18n.baseText('runData.executionStatus.failed')
							: runTaskData?.executionStatus === 'canceled'
								? i18n.baseText('runData.executionStatus.canceled')
								: i18n.baseText('runData.executionStatus.success')
					}} </PongText
				><br />
				<PongText :bold="true" size="small">{{ i18n.baseText('runData.startTime') + ':' }}</PongText>
				{{ runMetadata.startTime }}<br />
				<PongText :bold="true" size="small">{{
					i18n.baseText('runData.executionTime') + ':'
				}}</PongText>
				{{ runMetadata.executionTime }} {{ i18n.baseText('runData.ms') }}
			</div>
		</PongInfoTip>
	</div>
</template>

<style lang="scss" module>
.tooltipRow {
	display: flex;
	column-gap: var(--spacing--4xs);
}
</style>
