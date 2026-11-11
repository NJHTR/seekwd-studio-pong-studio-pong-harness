<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { ref, computed } from 'vue';
import { useEvaluationStore } from '../../evaluation.store';
import { VIEWS } from '@/app/constants';
import StepHeader from '../shared/StepHeader.vue';
import { useRouter } from 'vue-router';
import { useUsageStore } from '@/features/settings/usage/usage.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { I18nT } from 'vue-i18n';

import { PongButton, PongCallout, PongText } from '@pong/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'pong-workflow';
import { useWorkflowEvaluationState } from '../../composables/useWorkflowEvaluationState';
defineEmits<{
	runTest: [];
}>();

const router = useRouter();
const locale = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const evaluationStore = useEvaluationStore();
const nodeTypesStore = useNodeTypesStore();
const evaluationState = useWorkflowEvaluationState();
const usageStore = useUsageStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const hasRuns = computed(() => {
	return evaluationStore.testRunsByWorkflowId[workflowDocumentStore.value.workflowId]?.length > 0;
});

const evaluationsAvailable = computed(() => {
	return (
		usageStore.workflowsWithEvaluationsLimit === -1 ||
		usageStore.workflowsWithEvaluationsCount < usageStore.workflowsWithEvaluationsLimit
	);
});

const evaluationsQuotaExceeded = computed(() => {
	return (
		usageStore.workflowsWithEvaluationsLimit !== -1 &&
		usageStore.workflowsWithEvaluationsCount >= usageStore.workflowsWithEvaluationsLimit &&
		!hasRuns.value
	);
});

const activeStepIndex = ref(0);

// Calculate the initial active step based on the workflow state
const initializeActiveStep = () => {
	if (evaluationsQuotaExceeded.value) {
		activeStepIndex.value = 2;
		return;
	}

	if (
		evaluationState.evaluationTriggerExists.value &&
		evaluationState.evaluationSetMetricsNodeExist.value
	) {
		activeStepIndex.value = 3;
	} else if (
		evaluationState.evaluationTriggerExists.value &&
		evaluationState.evaluationSetOutputsNodeExist.value
	) {
		activeStepIndex.value = 2;
	} else if (evaluationState.evaluationTriggerExists.value) {
		activeStepIndex.value = 1;
	} else {
		activeStepIndex.value = 0;
	}
};

// Run initialization on component mount
initializeActiveStep();

const toggleStep = (index: number) => {
	activeStepIndex.value = index;
};

function navigateToWorkflow(
	action?: 'addEvaluationTrigger' | 'addEvaluationNode' | 'executeEvaluation',
) {
	const routeWorkflowId = workflowDocumentStore.value.workflowId || 'new';

	void router.push({
		name: VIEWS.WORKFLOW,
		params: { workflowId: routeWorkflowId },
		query: action ? { action } : undefined,
	});
}

function onSeePlans() {
	void pageRedirectionHelper.goToUpgrade('evaluations', 'upgrade-evaluations');
}
</script>

<template>
	<div :class="$style.container" data-test-id="evaluation-setup-wizard">
		<div :class="$style.steps">
			<!-- Step 1 -->
			<div :class="[$style.step, $style.completed]">
				<StepHeader
					:step-number="1"
					:title="locale.baseText('evaluations.setupWizard.step1.title')"
					:is-completed="evaluationState.evaluationTriggerExists.value"
					:is-active="activeStepIndex === 0"
					@click="toggleStep(0)"
				/>
				<div v-if="activeStepIndex === 0" :class="$style.stepContent">
					<ul :class="$style.bulletPoints">
						<li>
							<PongText size="small" color="text-base">
								{{ locale.baseText('evaluations.setupWizard.step1.item1') }}
							</PongText>
						</li>
						<li>
							<PongText size="small" color="text-base">
								{{ locale.baseText('evaluations.setupWizard.step1.item2') }}
							</PongText>
						</li>
					</ul>

					<div
						v-if="!nodeTypesStore.isNodeTypeUnavailable(EVALUATION_TRIGGER_NODE_TYPE)"
						:class="$style.actionButton"
					>
						<PongButton
							variant="outline"
							size="small"
							@click="navigateToWorkflow('addEvaluationTrigger')"
						>
							{{ locale.baseText('evaluations.setupWizard.step1.button') }}
						</PongButton>
					</div>
				</div>
			</div>

			<!-- Step 2 -->
			<div :class="[$style.step, activeStepIndex === 1 ? $style.active : '']">
				<StepHeader
					:step-number="2"
					:title="locale.baseText('evaluations.setupWizard.step2.title')"
					:is-completed="evaluationState.evaluationSetOutputsNodeExist.value"
					:is-active="activeStepIndex === 1"
					@click="toggleStep(1)"
				/>
				<div v-if="activeStepIndex === 1" :class="$style.stepContent">
					<ul :class="$style.bulletPoints">
						<li>
							<PongText size="small" color="text-base">
								{{ locale.baseText('evaluations.setupWizard.step2.item1') }}
							</PongText>
						</li>
					</ul>
					<div :class="$style.actionButton">
						<PongButton
							variant="outline"
							size="small"
							@click="navigateToWorkflow('addEvaluationNode')"
						>
							{{ locale.baseText('evaluations.setupWizard.step2.button') }}
						</PongButton>
					</div>
				</div>
			</div>

			<!-- Step 3 -->
			<div :class="$style.step">
				<StepHeader
					:step-number="3"
					:title="locale.baseText('evaluations.setupWizard.step3.title')"
					:is-completed="evaluationState.evaluationSetMetricsNodeExist.value"
					:is-active="activeStepIndex === 2"
					:is-optional="true"
					@click="toggleStep(2)"
				/>
				<div v-if="activeStepIndex === 2" :class="$style.stepContent">
					<ul v-if="!evaluationsQuotaExceeded" :class="$style.bulletPoints">
						<li>
							<PongText size="small" color="text-base">
								{{ locale.baseText('evaluations.setupWizard.step3.item1') }}
							</PongText>
						</li>
						<li>
							<PongText size="small" color="text-base">
								{{ locale.baseText('evaluations.setupWizard.step3.item2') }}
							</PongText>
						</li>
					</ul>
					<PongCallout v-else theme="warning" iconless>
						{{ locale.baseText('evaluations.setupWizard.limitReached') }}
					</PongCallout>
					<div :class="$style.actionButton">
						<PongButton
							variant="outline"
							v-if="!evaluationsQuotaExceeded"
							size="small"
							@click="navigateToWorkflow('addEvaluationNode')"
						>
							{{ locale.baseText('evaluations.setupWizard.step3.button') }}
						</PongButton>
						<PongButton v-else size="small" @click="onSeePlans">
							{{ locale.baseText('generic.seePlans') }}
						</PongButton>
						<PongButton
							variant="ghost"
							size="small"
							style="color: var(--color--text--tint-1)"
							@click="toggleStep(3)"
						>
							{{ locale.baseText('evaluations.setupWizard.step3.skip') }}
						</PongButton>
					</div>
					<div
						v-if="usageStore.workflowsWithEvaluationsLimit !== -1 && evaluationsAvailable"
						:class="$style.quotaNote"
					>
						<PongText size="xsmall" color="text-base">
							<I18nT keypath="evaluations.setupWizard.step3.notice" scope="global">
								<template #link>
									<a style="text-decoration: underline; color: inherit" @click="onSeePlans"
										>{{ locale.baseText('evaluations.setupWizard.step3.notice.link') }}
									</a>
								</template>
							</I18nT>
						</PongText>
					</div>
				</div>
			</div>

			<!-- Step 4 -->
			<div :class="$style.step">
				<StepHeader
					:step-number="4"
					:title="locale.baseText('evaluations.setupWizard.step4.title')"
					:is-completed="false"
					:is-active="activeStepIndex === 3"
					@click="toggleStep(3)"
				>
					<div :class="[$style.actionButton, $style.actionButtonInline]">
						<PongButton
							variant="outline"
							v-if="
								evaluationState.evaluationSetMetricsNodeExist.value && !evaluationsQuotaExceeded
							"
							size="medium"
							:disabled="
								!evaluationState.evaluationTriggerExists.value ||
								(!evaluationState.evaluationSetOutputsNodeExist.value &&
									!evaluationState.evaluationSetMetricsNodeExist.value)
							"
							@click="$emit('runTest')"
						>
							{{ locale.baseText('evaluations.setupWizard.step4.button') }}
						</PongButton>
						<PongButton
							variant="outline"
							v-else
							size="medium"
							:disabled="
								!evaluationState.evaluationTriggerExists.value ||
								(!evaluationState.evaluationSetOutputsNodeExist.value &&
									!evaluationState.evaluationSetMetricsNodeExist.value)
							"
							@click="navigateToWorkflow('executeEvaluation')"
						>
							{{ locale.baseText('evaluations.setupWizard.step4.altButton') }}
						</PongButton>
					</div>
				</StepHeader>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	background-color: var(--color--background--light-2);
}

.steps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.step {
	overflow: hidden;
}

.stepContent {
	padding: 0 0 0 calc(var(--spacing--xs) + 28px);
	animation: slideDown 0.2s ease;
}

.bulletPoints {
	padding-left: var(--spacing--sm);

	li {
		margin-bottom: var(--spacing--3xs);
	}
}

.actionButton {
	margin-top: var(--spacing--sm);
	display: flex;
	gap: var(--spacing--sm);

	button {
		font-weight: var(--font-weight--medium);
	}
}

.actionButtonInline {
	margin: 0;
}

.quotaNote {
	margin-top: var(--spacing--2xs);
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
