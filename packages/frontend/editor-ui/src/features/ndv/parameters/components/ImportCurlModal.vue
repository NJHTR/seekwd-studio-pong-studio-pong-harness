<script lang="ts" setup>
import { IMPORT_CURL_MODAL_KEY } from '@/app/constants';
import { computed, onMounted, ref } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@pong/composables/useTelemetry';
import { useToast } from '@pong/composables/useToast';
import { useI18n } from '@pong/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';

import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongInput,
	PongInputLabel,
	PongNotice,
} from '@pong/design-system';

defineOptions({ inheritAttrs: false });
const telemetry = useTelemetry();
const toast = useToast();
const i18n = useI18n();

const uiStore = useUIStore();
const ndvStore = injectNDVStore();

const curlCommand = ref('');
const modalOpen = computed(() => uiStore.modalsById[IMPORT_CURL_MODAL_KEY]?.open === true);

const inputRef = ref<{ focus: () => void; blur: () => void; select: () => void } | null>(null);

onMounted(() => {
	const curlCommands = uiStore.modalsById[IMPORT_CURL_MODAL_KEY].data?.curlCommands as Record<
		string,
		string
	>;
	const nodeId = ndvStore.value.activeNode?.id ?? '';
	const command = curlCommands?.[nodeId];
	curlCommand.value = command ?? '';
});

function onInput(value: string): void {
	curlCommand.value = value;
}

function onFocus(): void {
	inputRef.value?.select();
}

function closeDialog(): void {
	uiStore.closeModal(IMPORT_CURL_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

function onImportSuccess() {
	sendTelemetry();
	closeDialog();
}

function onImportFailure(data: { invalidProtocol: boolean; protocol?: string }) {
	sendTelemetry({ success: false, ...data });
}

function onAfterImport() {
	const nodeId = ndvStore.value.activeNode?.id as string;
	const curlCommands = uiStore.modalsById[IMPORT_CURL_MODAL_KEY].data?.curlCommands as
		| Record<string, string>
		| undefined;
	// Copied rather than mutated: what the store resolves is derived state, and for
	// an untouched modal it comes from the shared initial-state catalogue.
	uiStore.setModalData({
		name: IMPORT_CURL_MODAL_KEY,
		data: { curlCommands: { ...curlCommands, [nodeId]: curlCommand.value } },
	});
}

function sendTelemetry(
	data: { success: boolean; invalidProtocol: boolean; protocol?: string } = {
		success: true,
		invalidProtocol: false,
		protocol: '',
	},
): void {
	telemetry.track('User imported curl command', {
		success: data.success,
		invalidProtocol: data.invalidProtocol,
		protocol: data.protocol,
	});
}

async function onImport() {
	try {
		const { useImportCurlCommand } = await import('@/app/composables/useImportCurlCommand');
		const { importCurlCommand } = useImportCurlCommand({
			onImportSuccess,
			onImportFailure,
			onAfterImport,
		});
		importCurlCommand(curlCommand);
	} catch {
		// Handles WASM loading failures (e.g. wrong MIME type for tree-sitter.wasm)
		toast.showToast({
			title: i18n.baseText('importCurlParameter.showError.failedToLoad.title'),
			message: i18n.baseText('importCurlParameter.showError.failedToLoad.message'),
			type: 'error',
			duration: 0,
		});
		onImportFailure({ invalidProtocol: false });
	}
}
</script>

<template>
	<PongDialog
		:open="modalOpen"
		size="large"
		:header="i18n.baseText('importCurlModal.title')"
		@update:open="onDialogOpenUpdate"
	>
		<PongDialogBody>
			<PongInputLabel :label="i18n.baseText('importCurlModal.input.label')" color="text-dark">
				<PongInput
					ref="inputRef"
					:model-value="curlCommand"
					type="textarea"
					:rows="5"
					data-test-id="import-curl-modal-input"
					:placeholder="i18n.baseText('importCurlModal.input.placeholder')"
					@update:model-value="onInput"
					@focus="onFocus"
				/>
			</PongInputLabel>
		</PongDialogBody>
		<PongDialogFooter :class="$style.footer">
			<PongNotice
				:class="$style.notice"
				:content="i18n.baseText('ImportCurlModal.notice.content')"
			/>

			<PongButton
				:label="i18n.baseText('importCurlModal.button.label')"
				data-test-id="import-curl-modal-button"
				@click="onImport"
			/>
		</PongDialogFooter>
	</PongDialog>
</template>

<style module lang="scss">
.footer {
	justify-content: space-between;
}

.notice {
	margin: 0;
}
</style>
