<script setup lang="ts">
import {
	PongButton,
	PongDialog,
	PongDialogDescription,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';

defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	// The shared removal flow passes this on. WhatsApp has no external resource to delete.
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		stacked
		:show-close-button="!loading"
		@update:open="(value) => !value && !loading && emit('cancel')"
	>
		<PongDialogHeader>
			<PongDialogTitle>
				{{ i18n.baseText('agents.channels.whatsapp.remove.title') }}
			</PongDialogTitle>
		</PongDialogHeader>
		<div :class="$style.content">
			<PongDialogDescription as-child>
				<PongText size="medium" color="text-light">
					{{ i18n.baseText('agents.channels.whatsapp.remove.description') }}
				</PongText>
			</PongDialogDescription>
		</div>
		<PongDialogFooter>
			<div :class="$style.actions">
				<PongButton variant="outline" :disabled="loading" @click="emit('cancel')">
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton
					variant="destructive"
					:loading="loading"
					data-testid="whatsapp-remove-confirm"
					@click="emit('confirm', false)"
				>
					{{ i18n.baseText('agents.channels.whatsapp.remove.confirm') }}
				</PongButton>
			</div>
		</PongDialogFooter>
	</PongDialog>
</template>

<style module lang="scss">
.content {
	margin-top: var(--spacing--md);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	width: 100%;
}
</style>
