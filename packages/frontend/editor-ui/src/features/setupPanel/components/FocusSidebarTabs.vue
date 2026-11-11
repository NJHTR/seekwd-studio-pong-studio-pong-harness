<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';
import type { FocusSidebarTabs } from '@/features/setupPanel/types';
import type { TabOptions } from '@pong/design-system';
import { PongIcon, PongTabs } from '@pong/design-system';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useEvaluationsWizardSidepanelExperiment } from '@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment';

const i18n = useI18n();
const focusPanelStore = useFocusPanelStore();
const setupPanelStore = useSetupPanelStore();
const isSetupPanelEnabled = computed(() => setupPanelStore.isFeatureEnabled);
const { isFeatureEnabled: isEvaluationsWizardSidepanelEnabled } =
	useEvaluationsWizardSidepanelExperiment();

const props = withDefaults(
	defineProps<{
		modelValue?: FocusSidebarTabs;
		tabLabels?: {
			setup?: string;
			focus?: string;
			evaluations?: string;
		};
	}>(),
	{
		modelValue: 'setup',
		tabLabels: () => ({}),
	},
);

const emit = defineEmits<{
	'update:modelValue': [tab: FocusSidebarTabs];
}>();

const tabs = computed<Array<TabOptions<FocusSidebarTabs>>>(() => {
	const opts: Array<TabOptions<FocusSidebarTabs>> = [];
	// Only offer the Setup tab when its feature is on — otherwise selecting it
	// falls through to the focus panel, so the tab does nothing.
	if (isSetupPanelEnabled.value) {
		opts.push({
			label: props.tabLabels?.setup ?? i18n.baseText('setupPanel.tabs.setup'),
			value: 'setup',
		});
	}
	opts.push({
		label: props.tabLabels?.focus ?? i18n.baseText('setupPanel.tabs.focus'),
		value: 'focus',
	});
	if (isEvaluationsWizardSidepanelEnabled.value) {
		opts.push({
			label: props.tabLabels?.evaluations ?? i18n.baseText('setupPanel.tabs.evaluations'),
			value: 'evaluations',
		});
	}
	return opts;
});

const onTabSelected = (tab: FocusSidebarTabs) => {
	emit('update:modelValue', tab);
};
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-tabs">
		<PongTabs
			:model-value="modelValue"
			:options="tabs"
			size="small"
			@update:model-value="onTabSelected"
		/>
		<button
			data-test-id="setup-panel-close"
			:class="$style['close-button']"
			@click="focusPanelStore.closeFocusPanel()"
		>
			<PongIcon icon="x" size="small" />
		</button>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
	padding-top: var(--spacing--xs);
	position: relative;

	&::after {
		content: '';
		position: absolute;
		bottom: 1px;
		left: 0;
		right: 0;
		height: var(--border-width);
		background-color: var(--color--foreground);
		z-index: 1;
	}
}

.close-button {
	display: flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	right: var(--spacing--xs);
	top: 50%;
	transform: translateY(-50%);
	padding: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	border-radius: var(--radius);
	z-index: 2;

	&:hover {
		color: var(--color--text);
	}
}
</style>
