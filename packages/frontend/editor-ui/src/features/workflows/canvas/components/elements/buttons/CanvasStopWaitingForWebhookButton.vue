<script lang="ts" setup>
import { useI18n } from '@pong/i18n';

import { PongIconButton } from '@pong/design-system';
const props = defineProps<{
	size?: 'small' | 'medium' | 'large' | 'xlarge';
}>();
const i18n = useI18n();
</script>
<template>
	<PongIconButton
		variant="outline"
		class="stop-execution"
		icon="square"
		:size="props.size ?? 'large'"
		:title="i18n.baseText('nodeView.stopWaitingForWebhookCall')"
		data-test-id="stop-execution-waiting-for-webhook-button"
	/>
</template>
