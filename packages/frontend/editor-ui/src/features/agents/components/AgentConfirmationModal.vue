<script setup lang="ts">
import { computed, ref } from 'vue';
import { PongButton, PongIcon, PongText } from '@pong/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import AgentModal from './modals/AgentModal.vue';

export type AgentConfirmationModalData = {
	title: string;
	description: string;
	confirmButtonText: string;
	cancelButtonText: string;
	isDestructive?: boolean;
	onConfirm?: () => unknown | Promise<unknown>;
	onCancel?: () => unknown | Promise<unknown>;
	onClose?: () => unknown | Promise<unknown>;
};

const props = defineProps<{
	modalName: string;
	data: AgentConfirmationModalData;
}>();

const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const submitting = ref(false);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

async function onCancel() {
	await props.data.onCancel?.();
	closeModal();
}

async function onConfirm() {
	submitting.value = true;
	try {
		const shouldClose = await props.data.onConfirm?.();
		if (shouldClose !== false) closeModal();
	} catch {
		// Keep the modal open when the caller handles an async failure.
	} finally {
		submitting.value = false;
	}
}

async function onOpenChange(open: boolean) {
	if (open) return;
	const shouldClose = await props.data.onClose?.();
	if (shouldClose !== false) closeModal();
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="props.data.title"
		:busy="submitting"
		:show-cancel="false"
		size="large"
		data-testid="agent-confirmation-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.content">
			<PongIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
			<PongText size="medium">
				{{ props.data.description }}
			</PongText>
		</div>
		<template #footerActions>
			<PongButton variant="outline" size="medium" :disabled="submitting" @click="onCancel">
				{{ props.data.cancelButtonText }}
			</PongButton>
			<PongButton
				:variant="props.data.isDestructive ? 'destructive' : 'solid'"
				size="medium"
				:loading="submitting"
				@click="onConfirm"
			>
				{{ props.data.confirmButtonText }}
			</PongButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
}
</style>
