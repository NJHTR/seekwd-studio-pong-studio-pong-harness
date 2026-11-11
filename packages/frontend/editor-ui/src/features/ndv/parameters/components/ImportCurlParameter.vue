<script lang="ts" setup>
import { useI18n } from '@pong/i18n';
import { IMPORT_CURL_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import { PongButton } from '@pong/design-system';
defineProps<{
	isReadOnly?: boolean;
}>();

const uiStore = useUIStore();
const i18n = useI18n();

function onImportCurlClicked() {
	uiStore.openModal(IMPORT_CURL_MODAL_KEY);
}
</script>

<template>
	<div :class="$style.importSection">
		<PongButton
			variant="outline"
			:label="i18n.baseText('importCurlParameter.label')"
			:disabled="isReadOnly"
			size="xsmall"
			@click="onImportCurlClicked"
		/>
	</div>
</template>

<style module lang="scss">
.importSection {
	display: flex;
	flex-direction: row-reverse;
	margin-top: var(--spacing--xs);
}
</style>
