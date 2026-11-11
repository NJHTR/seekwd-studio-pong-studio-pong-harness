<script setup lang="ts">
import { useTelemetry } from '@pong/composables/useTelemetry';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useI18n } from '@pong/i18n';
import type { ExecutionSummary } from 'pong-workflow';
import { computed } from 'vue';
import { PongText } from '@pong/design-system';
import { hasCancellableExecutions } from '../executions.utils';

const props = defineProps<{
	executions: ExecutionSummary[];
}>();

const uiStore = useUIStore();
const i18n = useI18n();

const hasCancellableExecution = computed(() => hasCancellableExecutions(props.executions));

const telemetry = useTelemetry();

function onStopManyExecutions() {
	telemetry.track('User initiated stop many executions');
	uiStore.openModal(STOP_MANY_EXECUTIONS_MODAL_KEY);
}
</script>

<template>
	<PongText
		v-if="hasCancellableExecution"
		:class="$style.stopAll"
		size="small"
		color="text-base"
		@click="onStopManyExecutions"
		>{{ i18n.baseText('generic.stopAll') }}</PongText
	>
</template>

<style module lang="scss">
.stopAll {
	cursor: pointer;
	&:hover {
		text-decoration: underline;
	}
}
</style>
