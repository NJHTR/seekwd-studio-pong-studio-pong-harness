<script setup lang="ts">
import {
	PongButton,
	PongCheckbox,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { ref, watch } from 'vue';

const props = defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
const deleteExternalResource = ref(true);

watch(
	() => props.open,
	(open) => {
		if (open) deleteExternalResource.value = true;
	},
);
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
				{{ i18n.baseText('agents.channels.slack.managed.remove.title') }}
			</PongDialogTitle>
		</PongDialogHeader>
		<PongDialogBody>
			<div :class="$style.content">
				<PongText size="medium">
					{{ i18n.baseText('agents.channels.slack.managed.remove.description') }}
				</PongText>
				<PongCheckbox
					v-model="deleteExternalResource"
					:disabled="loading"
					data-testid="slack-managed-remove-delete-app"
				>
					<template #label>
						<PongText size="medium">
							{{ i18n.baseText('agents.channels.slack.managed.remove.deleteApp') }}
							<PongText size="medium" :bold="true">
								{{ i18n.baseText('agents.channels.slack.managed.remove.messagesUnaffected') }}
							</PongText>
						</PongText>
					</template>
				</PongCheckbox>
			</div>
		</PongDialogBody>
		<PongDialogFooter>
			<div :class="$style.actions">
				<PongButton variant="outline" :disabled="loading" @click="emit('cancel')">
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton
					variant="destructive"
					:loading="loading"
					data-testid="slack-managed-remove-confirm"
					@click="emit('confirm', deleteExternalResource)"
				>
					{{ i18n.baseText('agents.channels.slack.managed.remove.confirm') }}
				</PongButton>
			</div>
		</PongDialogFooter>
	</PongDialog>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	width: 100%;
}
</style>
