<script setup lang="ts">
import {
	appVersionDescriptionSchema,
	appVersionNameSchema,
	type AppResponse,
	type AppVersionResponse,
} from '@pong/api-types';
import { useToast } from '@pong/composables/useToast';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongInput,
	PongInputLabel,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { publishApp } from '../../apps.api';
import AppLinkField from './AppLinkField.vue';
import AppVisibilitySelect from './AppVisibilitySelect.vue';

const NAME_MAX_LENGTH = appVersionNameSchema.maxLength ?? 128;
const DESCRIPTION_MAX_LENGTH = appVersionDescriptionSchema.maxLength ?? 2000;

const props = defineProps<{ app: AppResponse; version: AppVersionResponse }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const label = ref('');
const description = ref('');
const visibility = ref(props.app.visibility);
const busy = ref(false);

const canPublish = computed(() => appVersionNameSchema.safeParse(label.value).success);

function reset() {
	label.value = props.version.label ?? props.app.name;
	description.value = props.version.description ?? '';
	visibility.value = props.app.visibility;
}

async function publish() {
	busy.value = true;
	try {
		emit(
			'updated',
			await publishApp(rootStore.restApiContext, props.app.projectId, props.app.id, {
				versionId: props.version.id,
				label: label.value,
				description: description.value,
				visibility: visibility.value === props.app.visibility ? undefined : visibility.value,
			}),
		);
		open.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.publish.error'));
	} finally {
		busy.value = false;
	}
}

watch(open, (isOpen) => isOpen && reset(), { immediate: true });
</script>

<template>
	<PongDialog
		v-model:open="open"
		size="medium"
		:header="i18n.baseText('apps.publish.dialog.title')"
		data-test-id="app-publish-dialog"
	>
		<PongDialogBody :class="$style.body">
			<PongInputLabel
				:label="i18n.baseText('apps.publish.dialog.name')"
				input-name="app-publish-name"
				required
				size="small"
				color="text-dark"
			>
				<PongInput
					id="app-publish-name"
					v-model="label"
					:maxlength="NAME_MAX_LENGTH"
					:disabled="busy"
					data-test-id="app-publish-name"
				/>
				<PongText :class="$style.counter" size="xsmall" color="text-light">
					{{ label.length }}/{{ NAME_MAX_LENGTH }}
				</PongText>
			</PongInputLabel>
			<PongInputLabel
				:label="i18n.baseText('apps.publish.dialog.description')"
				input-name="app-publish-description"
				size="small"
				color="text-dark"
			>
				<PongInput
					id="app-publish-description"
					v-model="description"
					type="textarea"
					:rows="4"
					:maxlength="DESCRIPTION_MAX_LENGTH"
					:disabled="busy"
					data-test-id="app-publish-description"
				/>
			</PongInputLabel>
			<AppLinkField v-if="app.publishedUrl" :url="app.publishedUrl" />
			<AppVisibilitySelect v-model="visibility" :disabled="busy" />
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="busy"
				@click="open = false"
			/>
			<PongButton
				variant="solid"
				:label="i18n.baseText('apps.publish.publish')"
				:loading="busy"
				:disabled="!canPublish"
				data-test-id="app-publish-dialog-confirm"
				@click="publish"
			/>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.counter {
	display: block;
	margin-top: var(--spacing--4xs);
	text-align: right;
}
</style>
