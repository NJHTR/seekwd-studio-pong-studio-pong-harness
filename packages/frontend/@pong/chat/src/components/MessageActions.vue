<script setup lang="ts">
import { PongTooltip, PongIcon } from '@pong/design-system';

import { useI18n, useChat, useOptions } from '@pong/chat/composables';
import { chatEventBus } from '@pong/chat/event-buses';
import type { ChatMessage } from '@pong/chat/types';

const props = defineProps<{
	message: ChatMessage;
}>();

const { options } = useOptions();
const chatStore = useChat();
const { t } = useI18n();

async function repostMessage() {
	if (props.message.sender === 'user') {
		// Repost user message by sending it again
		const messageText =
			'text' in props.message && typeof props.message.text === 'string' ? props.message.text : '';
		if (messageText.trim()) {
			await chatStore.sendMessage(
				messageText,
				props.message.files ? Array.from(props.message.files) : [],
			);
		}
	}
}

function copyToInput() {
	const messageText =
		'text' in props.message && typeof props.message?.text === 'string' ? props.message?.text : '';
	if (messageText.trim()) {
		chatEventBus.emit('setInputValue', messageText);
	}
}
</script>

<template>
	<div v-if="options.enableMessageActions" class="message-actions">
		<PongTooltip v-if="message.sender === 'user'">
			<PongIcon icon="redo-2" size="medium" class="icon" @click="repostMessage" />
			<template #content>{{ t('repostButton') }}</template>
		</PongTooltip>
		<PongTooltip v-if="message.sender === 'user'">
			<PongIcon icon="files" size="medium" class="icon" @click="copyToInput" />
			<template #content>{{ t('reuseButton') }}</template>
		</PongTooltip>
	</div>
</template>

<style lang="scss" scoped>
.message-actions {
	display: inline-flex;
	gap: var(--chat--message--actions--gap);
	margin: 0 var(--chat--message--actions--gap);
	align-items: center;
}

.icon {
	color: var(--chat--message--actions--color);
	cursor: pointer;

	&:hover {
		color: var(--chat--message--actions--hover);
	}
}
</style>
