import { PONG_CHAT_INTEGRATION_TYPE, type ChatIntegrationDescriptor } from '@pong/api-types';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

import { useAgentsPongChatFlag } from '../../composables/useAgentsPongChatFlag';

/**
 * pong Chat is an internal integration: the catalog endpoint never lists it, so
 * the channel list, the builder chips and the status fetches add it here,
 * first in the list and only while its feature flag is on.
 */
export function usePongChatChannel() {
	const i18n = useI18n();
	const isEnabled = useAgentsPongChatFlag();
	const descriptor = computed<ChatIntegrationDescriptor>(() => ({
		type: PONG_CHAT_INTEGRATION_TYPE,
		label: i18n.baseText('agents.channels.pongChat.label'),
		icon: 'message-square',
		credentialTypes: [],
	}));

	function withPongChat(integrations: ChatIntegrationDescriptor[]): ChatIntegrationDescriptor[] {
		return isEnabled.value ? [descriptor.value, ...integrations] : integrations;
	}

	return { isEnabled, withPongChat };
}
