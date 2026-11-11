<script setup lang="ts">
import type { AppResponse, AppVisibility } from '@pong/api-types';
import { useToast } from '@pong/composables/useToast';
import { PongHeading, PongIconButton, PongPopover, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed, ref } from 'vue';

import { updateApp } from '../../apps.api';
import { getAppPermissions } from '../../apps.permissions';
import AppLinkField from './AppLinkField.vue';
import AppVisibilitySelect from './AppVisibilitySelect.vue';

const props = defineProps<{ app: AppResponse; url: string }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const saving = ref(false);

const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);

async function save(visibility: AppVisibility) {
	saving.value = true;
	try {
		emit(
			'updated',
			await updateApp(rootStore.restApiContext, props.app.projectId, props.app.id, {
				visibility,
			}),
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.share.saveError'));
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<PongPopover side="bottom" align="end" width="400px" data-test-id="app-share">
		<template #trigger>
			<PongIconButton
				variant="outline"
				icon="link"
				:aria-label="i18n.baseText('apps.share.ariaLabel')"
				data-test-id="app-share-trigger"
			/>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="app-share-content">
				<PongHeading tag="h3" size="medium" color="text-dark">{{ app.name }}</PongHeading>
				<AppLinkField :url="url" />
				<AppVisibilitySelect
					:model-value="app.visibility"
					:disabled="!canUpdate || saving"
					@update:model-value="save"
				>
					<PongText size="small" color="text-light">
						{{ i18n.baseText('apps.share.hint') }}
					</PongText>
				</AppVisibilitySelect>
			</div>
		</template>
	</PongPopover>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}
</style>
