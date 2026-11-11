import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { useAssistantAgentThreadsStore } from '@/features/ai/instanceAi/assistantAgent/assistantAgentThreads.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';
import { useAgentsPongChatFlag } from '../composables/useAgentsPongChatFlag';
import { AGENT_PONG_CHAT_VIEW, RECENT_CHATS_LIMIT } from '../constants';
import { useAgentPongChatThreadsStore } from './pongChatThreads.store';
import { mergeRecentChats, type RecentChatItem } from './mergeRecentChats';

const asRouteParam = (value: unknown): string | undefined =>
	typeof value === 'string' ? value : undefined;

/**
 * The sidebar's recent-chats list: Instance AI threads only when the pong Chat flag is
 * off, merged with agent pong Chat threads when it's on — one place for callers (the
 * sidebar) to read instead of branching on the flag themselves. Assistant agent threads
 * merge in while the Assistant agent is on.
 */
export function useRecentChats() {
	const route = useRoute();
	const isAgentsPongChatFlag = useAgentsPongChatFlag();
	const instanceAiStore = useInstanceAiStore();
	const agentThreadsStore = useAgentPongChatThreadsStore();
	const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
	const instanceAiSettingsStore = useInstanceAiSettingsStore();

	const openThreadId = computed(() => {
		if (route.name === INSTANCE_AI_THREAD_VIEW) return asRouteParam(route.params.threadId);
		if (route.name === AGENT_PONG_CHAT_VIEW) return asRouteParam(route.params.agentThreadId);
		return undefined;
	});

	const recentChats = computed<RecentChatItem[]>(() =>
		mergeRecentChats(
			instanceAiStore.threads,
			isAgentsPongChatFlag.value ? agentThreadsStore.knownThreads : [],
			{
				limit: RECENT_CHATS_LIMIT,
				openThreadId: openThreadId.value,
				assistantAgentThreads: instanceAiSettingsStore.isAssistantAgentEnabled
					? assistantAgentThreadsStore.knownThreads
					: [],
			},
		),
	);

	return { recentChats };
}
