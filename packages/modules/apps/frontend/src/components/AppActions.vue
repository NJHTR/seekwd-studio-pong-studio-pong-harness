<script setup lang="ts">
import type { AppResponse } from '@pong/api-types';
import { useToast } from '@pong/composables/useToast';
import { PongActionToggle, useMessage } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { ResponseError } from '@pong/rest-api-client';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed } from 'vue';

import { deleteApp } from '../apps.api';
import { getAppPermissions } from '../apps.permissions';

const props = defineProps<{ app: AppResponse }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();

const canDelete = computed(() => getAppPermissions(props.app.projectId).canDelete);
const actions = computed(() => [{ label: i18n.baseText('generic.delete'), value: 'delete' }]);

async function onAction(action: string) {
	if (action !== 'delete') return;

	const answer = await message.confirm(
		i18n.baseText('apps.delete.message', { interpolate: { name: props.app.name } }),
		i18n.baseText('apps.delete.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	if (answer !== 'confirm') return;

	try {
		await deleteApp(rootStore.restApiContext, props.app.projectId, props.app.id);
		emit('deleted', props.app.id);
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 404) {
			emit('deleted', props.app.id);
			return;
		}
		toast.showError(error, i18n.baseText('apps.delete.error'));
	}
}
</script>

<template>
	<PongActionToggle
		v-if="canDelete"
		:actions="actions"
		theme="dark"
		data-test-id="app-actions"
		@action="onAction"
	/>
</template>
