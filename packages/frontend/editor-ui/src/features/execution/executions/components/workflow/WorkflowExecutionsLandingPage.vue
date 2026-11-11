<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import WorkflowExecutionsInfoAccordion from './WorkflowExecutionsInfoAccordion.vue';
import { useI18n } from '@pong/i18n';

import { PongButton, PongHeading, PongText } from '@pong/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
const router = useRouter();
const route = useRoute();
const locale = useI18n();

const workflowId = useInjectWorkflowId();
const uiStore = useUIStore();
const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const executionCount = computed(
	() => workflowExecutionStateStore.value.currentWorkflowExecutions.length,
);
const containsTrigger = computed(() => workflowDocumentStore.value.workflowTriggerNodes.length > 0);

function onSetupFirstStep(): void {
	const resolvedWorkflowId = workflowId.value || route.params.workflowId;

	uiStore.addFirstStepOnLoad = true;

	void router.push({
		name: VIEWS.WORKFLOW,
		params: { workflowId: resolvedWorkflowId },
		query: { ...route.query },
	});
}
</script>

<template>
	<div :class="['workflow-executions-container', $style.container]">
		<div v-if="executionCount === 0" :class="[$style.messageContainer, $style.noExecutionsMessage]">
			<div v-if="!containsTrigger" data-test-id="workflow-execution-no-trigger-content">
				<PongHeading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ locale.baseText('executionsLandingPage.emptyState.noTrigger.heading') }}
				</PongHeading>
				<PongText size="medium">
					{{ locale.baseText('executionsLandingPage.emptyState.message') }}
				</PongText>
				<PongButton variant="outline" class="mt-l" size="large" @click="onSetupFirstStep">
					{{ locale.baseText('executionsLandingPage.emptyState.noTrigger.buttonText') }}
				</PongButton>
			</div>
			<div v-else data-test-id="workflow-execution-no-content">
				<PongHeading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ locale.baseText('executionsLandingPage.emptyState.heading') }}
				</PongHeading>
				<WorkflowExecutionsInfoAccordion />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	width: 100%;
	height: 100%;
	flex: 1;
	background-color: var(--color--background--light-2);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.messageContainer {
	color: var(--color--text);

	div {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
}

.icon {
	font-size: 24px;
	color: var(--color--foreground--shade-1);
}
</style>
