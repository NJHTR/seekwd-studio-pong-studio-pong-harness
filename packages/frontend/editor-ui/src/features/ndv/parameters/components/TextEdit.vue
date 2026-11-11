<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, inject } from 'vue';
import { ParameterInputModalContextKey } from '@/app/constants/injectionKeys';
import type { INodeProperties } from 'pong-workflow';
import { useI18n } from '@pong/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';

import { PongDialog, PongDialogBody, PongInput, PongInputLabel } from '@pong/design-system';
const props = defineProps<{
	dialogVisible: boolean;
	parameter: INodeProperties;
	path: string;
	modelValue: string;
	isReadOnly: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	closeDialog: [];
}>();

const inputField = ref<HTMLInputElement | null>(null);
const tempValue = ref('');

const ndvStore = injectNDVStore();
const parameterModalContext = inject(ParameterInputModalContextKey, undefined);
const i18n = useI18n();

const activeNode = computed(() => ndvStore.value.activeNode);

watch(
	() => props.dialogVisible,
	async (newValue) => {
		if (newValue) {
			await nextTick();
			inputField.value?.focus();
		}
	},
);

watch(
	() => props.modelValue,
	(value: string) => {
		tempValue.value = value;
	},
);

onMounted(() => {
	tempValue.value = props.modelValue;
});

const valueChanged = (value: string) => {
	emit('update:modelValue', value);
};

const onKeyDownEsc = () => {
	// Resetting input value when closing the dialog, required when closing it using the `Esc` key
	tempValue.value = props.modelValue;
	closeDialog();
};

const closeDialog = () => {
	// Handle the close externally as the visible parameter is an external prop
	// and is so not allowed to be changed here.
	emit('closeDialog');
};

const onDialogOpenUpdate = (open: boolean) => {
	if (!open) closeDialog();
};
</script>

<template>
	<div v-if="dialogVisible">
		<PongDialog
			:open="dialogVisible"
			size="2xlarge"
			:stacked="parameterModalContext !== undefined"
			:header="`${i18n.baseText('textEdit.edit')} ${i18n
				.nodeText(activeNode?.type)
				.inputLabelDisplayName(parameter, path)}`"
			@update:open="onDialogOpenUpdate"
		>
			<PongDialogBody>
				<div class="ignore-key-press-canvas">
					<PongInputLabel
						:label="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
					>
						<div @keydown.stop @keydown.esc="onKeyDownEsc">
							<PongInput
								ref="inputField"
								v-model="tempValue"
								type="textarea"
								:placeholder="i18n.nodeText(activeNode?.type).placeholder(parameter, path)"
								:read-only="isReadOnly"
								:rows="15"
								@update:model-value="valueChanged"
							/>
						</div>
					</PongInputLabel>
				</div>
			</PongDialogBody>
		</PongDialog>
	</div>
</template>
