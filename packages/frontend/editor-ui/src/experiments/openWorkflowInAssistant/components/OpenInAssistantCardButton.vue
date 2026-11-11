<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { PongIcon, PongButton, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import type { WorkflowResource } from '@/Interface';
import { INSTANCE_AI_NEW_VIEW, INSTANCE_AI_SOURCE_QUERY } from '@/features/ai/instanceAi/constants';

import { canOpenInAssistant } from '../composables/useOpenInAssistantCard';
import { useOpenWorkflowInAssistantStore } from '../stores/openWorkflowInAssistant.store';

const props = defineProps<{
	workflow: WorkflowResource;
	readOnly?: boolean;
}>();

const i18n = useI18n();
const router = useRouter();
const store = useOpenWorkflowInAssistantStore();

// Only opted-out treatment users get the button; everyone else opens as usual.
const show = computed(
	() => canOpenInAssistant(props.workflow, props.readOnly) && store.showsOptedOutCardButton,
);

async function onClick() {
	await router.push({
		name: INSTANCE_AI_NEW_VIEW,
		query: { workflowId: props.workflow.id, [INSTANCE_AI_SOURCE_QUERY]: 'workflow_list_button' },
	});
}
</script>

<template>
	<PongTooltip
		v-if="show"
		:content="i18n.baseText('experiments.openWorkflowInAssistant.cardButtonTooltip')"
		placement="top"
	>
		<PongButton
			variant="outline"
			icon-only
			size="small"
			:aria-label="i18n.baseText('experiments.openWorkflowInAssistant.cardButtonTooltip')"
			data-test-id="workflow-card-open-in-assistant"
			@click="onClick"
		>
			<PongIcon icon="pong-assistant" :size="12" />
		</PongButton>
	</PongTooltip>
</template>
