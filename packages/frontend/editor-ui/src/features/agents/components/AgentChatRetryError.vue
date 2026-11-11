<script setup lang="ts">
import { PongButton, PongCallout, PongIcon } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

defineProps<{
	message: string;
	retryMessageId?: string;
	retryDisabled?: boolean;
}>();

const emit = defineEmits<{
	retry: [messageId: string];
}>();
const i18n = useI18n();
</script>

<template>
	<PongCallout theme="danger" :class="$style.callout" data-testid="agent-chat-retry-error">
		{{ message }}
		<template v-if="retryMessageId" #trailingContent>
			<PongButton
				size="small"
				variant="outline"
				:class="$style.retryButton"
				:disabled="retryDisabled"
				data-testid="agent-chat-retry"
				@click="emit('retry', retryMessageId)"
			>
				<template #icon><PongIcon icon="refresh-cw" size="small" /></template>
				{{ i18n.baseText('agents.chat.retry') }}
			</PongButton>
		</template>
	</PongCallout>
</template>

<style module>
.callout {
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.callout > :first-child {
	flex: 1 1 auto;
	min-width: 0;
}

.callout :global(.pong-text) {
	min-width: 0;
	overflow-wrap: anywhere;
}

.retryButton {
	flex-shrink: 0;
	margin-left: auto;
}
</style>
