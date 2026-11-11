import MessageWithButtons from '@pong/chat/components/MessageWithButtons.vue';
import { MessageComponentKey } from '@pong/chat/constants/messageComponents';
import type { ChatOptions } from '@pong/chat/types';

export const defaultOptions: ChatOptions = {
	webhookUrl: 'http://localhost:5678',
	webhookConfig: {
		method: 'POST',
		headers: {},
	},
	target: '#pong-chat',
	mode: 'window',
	loadPreviousSession: true,
	chatInputKey: 'chatInput',
	chatSessionKey: 'sessionId',
	defaultLanguage: 'en',
	showWelcomeScreen: false,
	initialMessages: ['Hi there! 👋', 'My name is Nathan. How can I assist you today?'],
	i18n: {
		en: {
			title: 'Hi there! 👋',
			subtitle: "Start a chat. We're here to help you 24/7.",
			footer: '',
			getStarted: 'New Conversation',
			inputPlaceholder: 'Type your question..',
			closeButtonTooltip: 'Close chat',
			repostButton: 'Repost message',
			reuseButton: 'Reuse message',
		},
	},
	theme: {},
	enableStreaming: false,
	messageComponents: {
		[MessageComponentKey.WITH_BUTTONS]: MessageWithButtons,
	},
};

export const defaultMountingTarget = '#pong-chat';
