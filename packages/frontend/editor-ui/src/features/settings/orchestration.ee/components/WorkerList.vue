<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useI18n } from '@pong/i18n';
import { useOrchestrationStore } from '../orchestration.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePushConnection } from '@/app/composables/usePushConnection';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useRootStore } from '@pong/stores/useRootStore';
import { useTelemetry } from '@pong/composables/useTelemetry';
import WorkerCard from './WorkerCard.vue';

import { PongHeading, PongSpinner } from '@pong/design-system';
import ConnectionTracker from '@/app/components/ConnectionTracker.vue';
withDefaults(
	defineProps<{
		autoRefreshEnabled?: boolean;
	}>(),
	{
		autoRefreshEnabled: true,
	},
);

const router = useRouter();
const i18n = useI18n();
const pushConnection = usePushConnection({ router });
const documentTitle = useDocumentTitle();
const telemetry = useTelemetry();

const orchestrationManagerStore = useOrchestrationStore();
const rootStore = useRootStore();
const pushStore = usePushConnectionStore();

const initialStatusReceived = computed(() => orchestrationManagerStore.initialStatusReceived);

const workerIds = computed(() => Object.keys(orchestrationManagerStore.workers));

const pageTitle = computed(() => i18n.baseText('workerList.pageTitle'));

onMounted(() => {
	documentTitle.set(pageTitle.value);

	telemetry.track('User viewed worker view', {
		instance_id: rootStore.instanceId,
	});
});

onBeforeMount(() => {
	pushConnection.initialize();
	pushStore.pushConnect();
	orchestrationManagerStore.startWorkerStatusPolling();
});

onBeforeUnmount(() => {
	orchestrationManagerStore.stopWorkerStatusPolling();
	pushStore.pushDisconnect();
	pushConnection.terminate();
});
</script>

<template>
	<div>
		<ConnectionTracker class="actions"></ConnectionTracker>
		<div :class="$style.workerListHeader">
			<PongHeading tag="h1" size="2xlarge">{{ pageTitle }}</PongHeading>
		</div>
		<div v-if="!initialStatusReceived">
			<PongSpinner />
		</div>
		<div v-else>
			<div v-if="workerIds.length === 0">{{ i18n.baseText('workerList.empty') }}</div>
			<div v-else>
				<div v-for="workerId in workerIds" :key="workerId" :class="$style.card">
					<WorkerCard :worker-id="workerId" data-test-id="worker-card" />
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.workerListHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--sm);
}

.card {
	margin-bottom: var(--spacing--sm);
}

.tableLoader {
	width: 100%;
	height: 48px;
	margin-bottom: var(--spacing--2xs);
}
</style>
