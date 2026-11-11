<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogDescription,
	PongDialogFooter,
	PongInput,
	PongInputLabel,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';

const props = withDefaults(
	defineProps<{
		open: boolean;
		title: string;
		message: string;
		confirmLabel: string;
		// The exact word the user must type to enable the confirm button (e.g. "delete").
		confirmKeyword: string;
		loading?: boolean;
	}>(),
	{ loading: false },
);

const emit = defineEmits<{
	confirm: [];
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const typed = ref('');

const canConfirm = computed(() => typed.value.trim() === props.confirmKeyword);

// Reset the field each time the dialog re-opens so a previous attempt doesn't
// leave the confirm button enabled.
watch(
	() => props.open,
	(open) => {
		if (open) typed.value = '';
	},
);

function onConfirm(): void {
	if (!canConfirm.value || props.loading) return;
	emit('confirm');
}

function close(): void {
	emit('update:open', false);
}
</script>

<template>
	<PongDialog
		:open="open"
		:header="title"
		size="medium"
		stacked
		data-test-id="credential-type-to-confirm-dialog"
		@update:open="emit('update:open', $event)"
	>
		<PongDialogBody>
			<PongDialogDescription>{{ message }}</PongDialogDescription>
			<PongInputLabel
				:label="
					i18n.baseText('credentialEdit.credentialEdit.confirmMessage.typeToConfirm', {
						interpolate: { keyword: confirmKeyword },
					})
				"
			>
				<PongInput
					v-model="typed"
					data-test-id="credential-type-to-confirm-input"
					@keyup.enter="onConfirm"
				/>
			</PongInputLabel>
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="credential-type-to-confirm-cancel"
				@click="close"
			/>
			<PongButton
				variant="destructive"
				:label="confirmLabel"
				:disabled="!canConfirm"
				:loading="loading"
				data-test-id="credential-type-to-confirm-button"
				@click="onConfirm"
			/>
		</PongDialogFooter>
	</PongDialog>
</template>
