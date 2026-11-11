<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { ChatMessage } from '@/features/ai/chatHub/chat.types';
import CopyButton from '@/features/ai/chatHub/components/CopyButton.vue';
import type { ChatMessageId } from '@pong/api-types';
import { PongIconButton, PongLink, PongText, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { isEditable, isRegenerable } from '../chat.utils';

const i18n = useI18n();
const router = useRouter();
const workflowsStore = useWorkflowsStore();

const { message, isSpeaking, isSpeechSynthesisAvailable, hasSessionStreaming } = defineProps<{
	message: ChatMessage;
	isSpeechSynthesisAvailable: boolean;
	isSpeaking: boolean;
	hasSessionStreaming: boolean;
}>();

const emit = defineEmits<{
	edit: [];
	regenerate: [];
	switchAlternative: [messageId: ChatMessageId];
	readAloud: [];
}>();

const currentAlternativeIndex = computed(() => {
	return message.alternatives.findIndex((id) => id === message.id);
});

const text = computed(() => message.content.map((c) => c.content).join('\n\n'));

const executionUrl = computed(() => {
	if (
		workflowsStore.canViewWorkflows &&
		message.type === 'ai' &&
		message.provider === 'pong' &&
		message.executionId
	) {
		return router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { workflowId: message.workflowId, executionId: message.executionId },
		}).href;
	}
	return undefined;
});

const canEdit = computed(() => isEditable(message));
const canRegenerate = computed(() => isRegenerable(message));

function handleEdit() {
	emit('edit');
}

function handleRegenerate() {
	emit('regenerate');
}

function handleReadAloud() {
	emit('readAloud');
}
</script>

<template>
	<div :class="$style.actions" data-test-id="chat-message-actions">
		<CopyButton :content="text" data-test-id="chat-message-copy" />
		<PongTooltip
			v-if="isSpeechSynthesisAvailable && message.type === 'ai'"
			placement="bottom"
			:show-after="300"
		>
			<PongIconButton
				variant="ghost"
				:icon="isSpeaking ? 'volume-x' : 'volume-2'"
				size="medium"
				@click="handleReadAloud"
			/>
			<template #content>{{
				isSpeaking
					? i18n.baseText('chatHub.message.actions.stopReading')
					: i18n.baseText('chatHub.message.actions.readAloud')
			}}</template>
		</PongTooltip>
		<PongTooltip v-if="canEdit" placement="bottom" :show-after="300">
			<PongIconButton
				variant="ghost"
				icon="pen"
				size="medium"
				data-test-id="chat-message-edit"
				:disabled="hasSessionStreaming"
				@click="handleEdit"
			/>
			<template #content>{{ i18n.baseText('chatHub.message.actions.edit') }}</template>
		</PongTooltip>
		<PongTooltip v-if="canRegenerate" placement="bottom" :show-after="300">
			<PongIconButton
				variant="ghost"
				icon="refresh-cw"
				size="medium"
				data-test-id="chat-message-regenerate"
				:disabled="hasSessionStreaming"
				@click="handleRegenerate"
			/>
			<template #content>{{ i18n.baseText('chatHub.message.actions.regenerate') }}</template>
		</PongTooltip>
		<PongTooltip v-if="executionUrl" placement="bottom" :show-after="300">
			<PongIconButton variant="ghost" icon="info" size="medium" data-test-id="chat-message-info" />
			<template #content>
				{{ i18n.baseText('chatHub.message.actions.executionId') }}:
				<PongLink :to="executionUrl" :new-window="true">
					{{ message.executionId }}
				</PongLink>
			</template>
		</PongTooltip>
		<template v-if="message.alternatives.length > 1">
			<PongIconButton
				variant="ghost"
				icon="chevron-left"
				size="medium"
				:disabled="hasSessionStreaming || currentAlternativeIndex === 0"
				data-test-id="chat-message-prev-alternative"
				@click="$emit('switchAlternative', message.alternatives[currentAlternativeIndex - 1])"
			/>
			<PongText size="medium" color="text-base">
				{{ `${currentAlternativeIndex + 1}/${message.alternatives.length}` }}
			</PongText>
			<PongIconButton
				variant="ghost"
				icon="chevron-right"
				size="medium"
				:disabled="
					hasSessionStreaming || currentAlternativeIndex === message.alternatives.length - 1
				"
				data-test-id="chat-message-next-alternative"
				@click="$emit('switchAlternative', message.alternatives[currentAlternativeIndex + 1])"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;

	& g,
	& path {
		color: var(--color--text--tint-1);
		stroke-width: 2.5;
	}
}
</style>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
