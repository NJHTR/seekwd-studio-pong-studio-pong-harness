<script setup lang="ts">
import { useI18n } from '@pong/i18n';

import { PongIconButton } from '@pong/design-system';
const i18n = useI18n();
</script>
<template>
	<PongIconButton
		:title="i18n.baseText('nodeView.deletesTheCurrentExecutionData')"
		icon="trash-2"
		size="large"
		data-test-id="clear-execution-data-button"
	/>
</template>
