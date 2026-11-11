<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import MCPWorkflowsSelect from '../components/MCPWorkflowsSelect.vue';
import { PongButton, PongDialog, PongDialogBody, PongDialogFooter } from '@pong/design-system';
import { computed, ref, watch } from 'vue';
import { useTelemetry } from '@pong/composables/useTelemetry';

const props = defineProps<{
	enableMcpAccess: (workflowIds: string[]) => Promise<void>;
}>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const telemetry = useTelemetry();

const isSaving = ref(false);
const selectedWorkflowIds = ref<string[]>([]);
// typescript-eslint reads an SFC import as `any`, so the ref names the one method it calls.
const selectRef = ref<{ focusOnInput: () => void } | null>(null);
const closedByAction = ref(false);

const canSave = computed(() => selectedWorkflowIds.value.length > 0);

// The view keeps this component mounted, so every opening starts from an empty selection.
watch(open, (isOpen) => {
	if (isOpen) {
		selectedWorkflowIds.value = [];
		closedByAction.value = false;
	} else if (!closedByAction.value) {
		telemetry.track('User dismissed mcp workflows dialog');
	}
});

async function save() {
	if (selectedWorkflowIds.value.length === 0) return;

	isSaving.value = true;
	try {
		await props.enableMcpAccess(selectedWorkflowIds.value);
		closedByAction.value = true;
		telemetry.track('User selected workflow from list', {
			workflowIds: selectedWorkflowIds.value,
			count: selectedWorkflowIds.value.length,
		});
		open.value = false;
	} finally {
		isSaving.value = false;
	}
}

function onSelectReady() {
	selectRef.value?.focusOnInput();
}

function onConfirm() {
	if (!isSaving.value) {
		void save();
	}
}
</script>

<template>
	<PongDialog
		v-model:open="open"
		size="xlarge"
		:header="i18n.baseText('settings.mcp.connectWorkflows.modalTitle')"
		:close-on-overlay-click="false"
		data-test-id="mcp-connect-workflows-dialog"
	>
		<PongDialogBody>
			<MCPWorkflowsSelect
				ref="selectRef"
				v-model="selectedWorkflowIds"
				:placeholder="i18n.baseText('settings.mcp.connectWorkflows.input.placeholder')"
				:disabled="isSaving"
				@ready="onSelectReady"
				@confirm="onConfirm"
			/>
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="isSaving"
				data-test-id="mcp-connect-workflows-cancel-button"
				@click="open = false"
			/>
			<PongButton
				variant="solid"
				:label="i18n.baseText('settings.mcp.connectWorkflows.confirm.label')"
				:loading="isSaving"
				:disabled="!canSave || isSaving"
				data-test-id="mcp-connect-workflows-save-button"
				@click="save"
			/>
		</PongDialogFooter>
	</PongDialog>
</template>
