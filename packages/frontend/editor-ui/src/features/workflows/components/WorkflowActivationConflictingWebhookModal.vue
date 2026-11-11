<script setup lang="ts">
import { createEventBus } from '@pong/utils/event-bus';
import Modal from '@/app/components/Modal.vue';
import { WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import { useRootStore } from '@pong/stores/useRootStore';
import { computed } from 'vue';
import { CHAT_TRIGGER_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'pong-workflow';

import { PongButton, PongCallout, PongLink, PongText } from '@pong/design-system';
const modalBus = createEventBus();
const uiStore = useUIStore();
const rootStore = useRootStore();

const props = defineProps<{
	data: {
		workflowName: string;
		triggerType: string;
		workflowId: string;
		webhookPath: string;
		node: string;
	};
}>();

const { data } = props;

const webhookUrl = computed(() => {
	return rootStore.webhookUrl;
});

const webhookTypeUi = computed((): { title: string; callout: string; suggestion: string } => {
	const suggestionBase = ' and activate this one, or ';

	if (data.triggerType === FORM_TRIGGER_NODE_TYPE)
		return {
			title: 'Form',
			callout: 'form trigger',
			suggestion: suggestionBase + 'adjust the following URL path in either workflow:',
		};
	if (data.triggerType === CHAT_TRIGGER_NODE_TYPE)
		return {
			title: 'Chat',
			callout: 'chat trigger',
			suggestion: suggestionBase + 'insert a new Chat Trigger node in either workflow:',
		};
	if (data.triggerType === WEBHOOK_NODE_TYPE)
		return {
			title: 'Webhook',
			callout: 'webhook trigger',
			suggestion: suggestionBase + 'adjust the following URL path in either workflow:',
		};

	return {
		title: 'Trigger',
		callout: 'trigger',
		suggestion: suggestionBase + 'insert a new trigger node of the same type in either workflow:',
	};
});

const workflowUrl = computed(() => {
	return rootStore.urlBaseEditor + 'workflow/' + data.workflowId;
});

const onClick = async () => {
	uiStore.closeModal(WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY);
};
</script>

<template>
	<Modal
		width="540px"
		:name="WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY"
		:title="`Conflicting ${webhookTypeUi.title} Path`"
		:event-bus="modalBus"
		:center="true"
	>
		<template #content>
			<PongCallout theme="danger" data-test-id="conflicting-webhook-callout">
				A {{ webhookTypeUi.callout }} '{{ data.node }}' in the workflow '{{ data.workflowName }}'
				uses a conflicting URL path, so this workflow cannot be activated
			</PongCallout>
			<div :class="$style.container">
				<div>
					<PongText color="text-base"> You can deactivate </PongText>
					<PongLink :to="workflowUrl" :underline="true">{{ data.workflowName }}</PongLink>
					{{ ' ' }}
					<PongText color="text-base" data-test-id="conflicting-webhook-suggestion">
						{{ webhookTypeUi.suggestion }}
					</PongText>
				</div>
			</div>
			<div data-test-id="conflicting-webhook-path">
				<PongText color="text-light"> {{ webhookUrl }}/</PongText>
				<PongText color="text-dark" bold>
					{{ data.webhookPath }}
				</PongText>
			</div>
		</template>
		<template #footer>
			<PongButton
				label="Done"
				size="medium"
				float="right"
				data-test-id="close-button"
				@click="onClick"
			/>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	margin-top: var(--spacing--md);
	margin-bottom: var(--spacing--sm);
}
</style>
