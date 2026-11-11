import { computed } from 'vue';
import type { AgentJsonConfig } from '@pong/api-types';
import { useI18n } from '@pong/i18n';

// The Assistant has no personalisation of its own: its brand icon on its brand gradient tokens,
// so the tile follows the theme like the rest of the Assistant UI.
const PONG_ASSISTANT_PERSONALISATION: AgentJsonConfig['personalisation'] = {
	icon: 'pong-assistant',
	gradient: {
		from: 'var(--assistant--color--highlight-1)',
		to: 'var(--assistant--color--highlight-3)',
		angle: 135,
		fromStop: 0,
		toStop: 100,
	},
};

/** How pong Assistant shows up next to agents in the pong Chat picker and library. */
export function usePongAssistantIdentity() {
	const i18n = useI18n();
	return {
		name: computed(() => i18n.baseText('instanceAi.view.title')),
		description: computed(() => i18n.baseText('agents.pongChatPage.picker.assistantDescription')),
		personalisation: PONG_ASSISTANT_PERSONALISATION,
	};
}
