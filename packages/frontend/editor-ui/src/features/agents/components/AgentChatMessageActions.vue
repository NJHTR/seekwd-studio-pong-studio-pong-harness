<script setup lang="ts">
import { PongChatActions, PongIconButton, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

const props = defineProps<{
	content: string;
	canSendToAssistant?: boolean;
}>();

const emit = defineEmits<{
	sendToAssistant: [];
}>();

defineSlots<{
	/** Extra actions after the default ones, for example the host `message-actions`. */
	'extra-actions'?: () => unknown;
}>();

const i18n = useI18n();
</script>

<template>
	<PongChatActions
		:content="props.content"
		data-test-id="agent-chat-message-actions"
		copy-test-id="agent-chat-message-copy"
		read-aloud-test-id="agent-chat-message-read-aloud"
	>
		<PongTooltip
			v-if="canSendToAssistant"
			placement="bottom"
			:show-after="300"
			:content="i18n.baseText('agents.builder.preview.sendToAssistant')"
		>
			<PongIconButton
				variant="ghost"
				icon="square-arrow-out-up-right"
				size="small"
				icon-size="medium"
				data-test-id="agent-chat-message-send-to-assistant"
				:aria-label="i18n.baseText('agents.builder.preview.sendToAssistant')"
				@click="emit('sendToAssistant')"
			/>
		</PongTooltip>
		<slot name="extra-actions" />
	</PongChatActions>
</template>
