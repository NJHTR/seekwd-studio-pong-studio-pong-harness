<script lang="ts" setup>
import type { QuickReplyType } from '@pong/api-types';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useUsersStore } from '@pong/stores/users.store';
import { computed, ref, useSlots } from 'vue';
import { PongAskAssistantChat, PongInfoTip } from '@pong/design-system';
import { useTelemetry } from '@pong/composables/useTelemetry';
import { useI18n } from '@pong/i18n';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import AskModeEmptyState from './AskModeEmptyState.vue';

const emit = defineEmits<{
	close: [];
}>();

const assistantStore = useAssistantStore();
const workflowId = useInjectWorkflowId();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const slots = useSlots();
const i18n = useI18n();

const pongChatRef = ref<InstanceType<typeof PongAskAssistantChat>>();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const loadingMessage = computed(() => assistantStore.assistantThinkingMessage);

const showUsabilityNotice = computed(
	() =>
		assistantStore.canManageAISettings && !settingsStore.settings.ai.allowSendingParameterValues,
);

async function onUserMessage(content: string, quickReplyType?: string, isFeedback = false) {
	// If there is no current session running, initialize the support chat session
	if (!assistantStore.currentSessionId) {
		await assistantStore.initSupportChat(workflowId.value, content);
	} else {
		await assistantStore.sendMessage(workflowId.value, {
			text: content,
			quickReplyType: quickReplyType as QuickReplyType,
		});
	}
	const task = assistantStore.chatSessionTask;
	const solutionCount = assistantStore.chatMessages.filter(
		(msg) => msg.role === 'assistant' && !['text', 'event'].includes(msg.type),
	).length;
	if (isFeedback) {
		telemetry.track('User gave feedback', {
			task,
			chat_session_id: assistantStore.currentSessionId,
			is_quick_reply: !!quickReplyType,
			is_positive: quickReplyType === 'all-good',
			solution_count: solutionCount,
			response: content,
		});
	}
}

async function onCodeReplace(index: number) {
	await assistantStore.applyCodeDiff(workflowId.value, index);
	telemetry.track('User clicked solution card action', {
		action: 'replace_code',
	});
}

async function undoCodeDiff(index: number) {
	await assistantStore.undoCodeDiff(workflowId.value, index);
	telemetry.track('User clicked solution card action', {
		action: 'undo_code_replace',
	});
}

defineExpose({
	focusInput: () => {
		pongChatRef.value?.focusInput();
	},
});
</script>

<template>
	<div data-test-id="ask-assistant-chat" tabindex="0" :class="$style.wrapper" @keydown.stop>
		<PongAskAssistantChat
			ref="pongChatRef"
			:user="user"
			:messages="assistantStore.chatMessages"
			:streaming="assistantStore.streaming"
			:loading-message="loadingMessage"
			:session-id="assistantStore.currentSessionId"
			:input-placeholder="i18n.baseText('aiAssistant.askMode.inputPlaceholder')"
			@close="emit('close')"
			@message="onUserMessage"
			@stop="assistantStore.abortStreaming"
			@code-replace="onCodeReplace"
			@code-undo="undoCodeDiff"
		>
			<template v-if="slots.header || showUsabilityNotice" #header>
				<slot name="header" />
				<PongInfoTip v-if="showUsabilityNotice" theme="warning" type="tooltip">
					<span>{{ i18n.baseText('aiAssistant.reducedHelp.chat.notice') }}</span>
				</PongInfoTip>
			</template>
			<template #placeholder>
				<AskModeEmptyState />
			</template>
		</PongAskAssistantChat>
	</div>
</template>

<style module lang="scss">
.wrapper {
	height: 100%;
	width: 100%;
}
</style>
