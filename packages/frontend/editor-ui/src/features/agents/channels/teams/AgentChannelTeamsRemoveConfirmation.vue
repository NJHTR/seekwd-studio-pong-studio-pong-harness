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
				{{ i18n.baseText('agents.channels.teams.remove.title') }}
			</PongDialogTitle>
		</PongDialogHeader>
		<PongDialogDescription as-child>
			<PongText size="medium" :class="$style.content">
				{{ i18n.baseText('agents.channels.teams.remove.description') }}
			</PongText>
		</PongDialogDescription>
		<PongDialogFooter>
			<div :class="$style.actions">
				<PongButton variant="outline" :disabled="loading" @click="emit('cancel')">
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton
					variant="destructive"
					:loading="loading"
					data-testid="teams-remove-confirm"
					@click="emit('confirm', false)"
				>
					{{ i18n.baseText('agents.channels.teams.remove.confirm') }}
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
