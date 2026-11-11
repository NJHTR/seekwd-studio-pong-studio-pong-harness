<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { PongHeading, PongButton } from '@pong/design-system';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { useI18n } from '@pong/i18n';
import { createEventBus } from '@pong/utils/event-bus';
import { useUIStore } from '@/app/stores/ui.store';
import { ref, computed, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import { generateVersionLabelFromId } from '@/features/workflows/workflowHistory/utils';
import type { EventBus } from '@pong/utils/event-bus';

export type WorkflowVersionFormModalEventBusEvents = {
	submit: { versionId: string; name: string; description: string };
	cancel: undefined;
};

export type WorkflowVersionFormModalData = {
	versionId: string;
	versionName?: string;
	description?: string;
	modalTitle: string;
	submitButtonLabel: string;
	submitting?: boolean;
	eventBus: EventBus<WorkflowVersionFormModalEventBusEvents>;
};

const props = defineProps<{
	modalName: string;
	data: WorkflowVersionFormModalData;
}>();

const i18n = useI18n();
const modalEventBus = createEventBus();
const uiStore = useUIStore();

const versionForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('versionForm');

const versionName = ref('');
const description = ref('');

const submitting = computed(() => props.data.submitting ?? false);

function onModalOpened() {
	versionForm.value?.focusInput();
}

onMounted(() => {
	if (props.data.versionName) {
		versionName.value = props.data.versionName;
	} else if (props.data.versionId) {
		versionName.value = generateVersionLabelFromId(props.data.versionId);
	}

	if (props.data.description) {
		description.value = props.data.description;
	}

	modalEventBus.on('opened', onModalOpened);
});

onBeforeUnmount(() => {
	modalEventBus.off('opened', onModalOpened);
});

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const onCancel = () => {
	props.data.eventBus.emit('cancel');
	closeModal();
};

const handleSubmit = () => {
	if (versionName.value.trim().length === 0) {
		return;
	}

	props.data.eventBus.emit('submit', {
		versionId: props.data.versionId,
		name: versionName.value,
		description: description.value,
	});
};
</script>

<template>
	<Modal
		width="500px"
		max-height="85vh"
		:name="modalName"
		:event-bus="modalEventBus"
		:center="true"
		:before-close="onCancel"
	>
		<template #header>
			<PongHeading size="xlarge">{{ data.modalTitle }}</PongHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<WorkflowVersionForm
					ref="versionForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:version-name-test-id="`${modalName}-version-name-input`"
					:description-test-id="`${modalName}-description-input`"
					@submit="handleSubmit"
				/>
				<div :class="$style.actions">
					<PongButton
						variant="outline"
						:disabled="submitting"
						:label="i18n.baseText('generic.cancel')"
						:data-test-id="`${modalName}-cancel-button`"
						@click="onCancel"
					/>
					<PongButton
						:loading="submitting"
						:disabled="versionName.trim().length === 0"
						:label="data.submitButtonLabel"
						:data-test-id="`${modalName}-submit-button`"
						@click="handleSubmit"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>
<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
