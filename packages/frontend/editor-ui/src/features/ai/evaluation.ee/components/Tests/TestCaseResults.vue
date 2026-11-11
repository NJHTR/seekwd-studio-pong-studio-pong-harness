<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { PongButton, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useToast } from '@pong/composables/useToast';
import { useTestCasePersistence } from '../../composables/useTestCasePersistence';
import { useWizardHydration } from '../WizardSidepanel/useWizardHydration';
import SuiteConfig from './SuiteConfig.vue';
import TestCaseResultCard from './TestCaseResultCard.vue';

const locale = useI18n();
const wizardStore = useEvaluationsWizardSidepanelStore();
const evaluationStore = useEvaluationStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const toast = useToast();
const { runAll, isPersisting } = useTestCasePersistence();
const { hydrate } = useWizardHydration();

const { datasetInputsByRow } = storeToRefs(wizardStore);

const hasTestCases = computed(() => datasetInputsByRow.value.length > 0);

// Load runs + the latest run's case executions so cards can show results.
async function loadResults() {
	const workflowId = workflowDocumentStore.value?.workflowId;
	if (!workflowId) return;
	try {
		await evaluationStore.fetchTestRuns(workflowId);
		const runs = [...(evaluationStore.testRunsByWorkflowId[workflowId] ?? [])].sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
		);
		const latest = runs[runs.length - 1];
		if (latest && !['new', 'running'].includes(latest.status)) {
			await evaluationStore.fetchTestCaseExecutions({ workflowId, runId: latest.id });
		}
	} catch (error) {
		console.warn('[TestCaseResults] failed to load results', error);
	}
}

onMounted(async () => {
	// Re-hydrate the config + dataset rows so cases created in the detail view
	// (which don't mutate `datasetInputsByRow`) show up when we return here.
	await hydrate();
	void loadResults();
});

const isRunningAll = ref(false);

async function handleRunAll() {
	if (isRunningAll.value) return;
	isRunningAll.value = true;
	try {
		const ok = await runAll();
		if (ok) await loadResults();
		else
			toast.showError(
				new Error('Run all failed'),
				locale.baseText('evaluations.tests.runAll.error'),
			);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.tests.runAll.error'));
	} finally {
		isRunningAll.value = false;
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="tests-results">
		<header :class="$style.header">
			<PongText tag="h2" size="small" color="text-dark" bold :class="$style.title">
				{{ locale.baseText('setupPanel.tabs.evaluations') }}
			</PongText>
			<div :class="$style.actions">
				<PongButton
					variant="outline"
					size="xsmall"
					data-test-id="tests-results-create-case"
					@click="wizardStore.openCreate()"
				>
					{{ locale.baseText('evaluations.tests.results.createCase') }}
				</PongButton>
				<PongButton
					variant="solid"
					size="xsmall"
					:loading="isRunningAll || isPersisting"
					:disabled="!hasTestCases"
					data-test-id="tests-results-run-all"
					@click="handleRunAll"
				>
					{{ locale.baseText('evaluations.tests.runAll') }}
				</PongButton>
			</div>
		</header>

		<div :class="$style.body">
			<SuiteConfig />

			<div v-if="hasTestCases" :class="$style.cards">
				<TestCaseResultCard v-for="(_, i) in datasetInputsByRow" :key="i" :index="i" />
			</div>

			<div v-else :class="$style.empty">
				<PongText size="small" color="text-light">
					{{ locale.baseText('evaluations.tests.results.empty') }}
				</PongText>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	height: 56px;
	flex-shrink: 0;
	padding: 0 var(--spacing--sm);
}

.title {
	margin: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.body {
	flex: 1 1 auto;
	overflow-y: auto;
	padding: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.cards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.empty {
	padding: var(--spacing--lg) var(--spacing--md);
	text-align: center;
}
</style>
