<script setup lang="ts">
import { PongCopyInput, PongInputLabel } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

defineProps<{ url: string }>();

const i18n = useI18n();
</script>

<template>
	<PongInputLabel :label="i18n.baseText('apps.link.label')" size="small" color="text-dark">
		<PongCopyInput
			:label="i18n.baseText('apps.link.label')"
			:value="url"
			size="medium"
			data-test-id="app-link"
		/>
	</PongInputLabel>
</template>
