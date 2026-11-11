import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useRootStore } from '@pong/stores/useRootStore';
import { useToast } from '@pong/composables/useToast';
import { useI18n } from '@pong/i18n';

import { useAgentPermissions } from './useAgentPermissions';
import { stopSession } from './useAgentThreadsApi';

export function useAgentSessionStop(
	projectId: MaybeRefOrGetter<string>,
	agentId: MaybeRefOrGetter<string>,
) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();
	const { canExecute } = useAgentPermissions(projectId);
	const stoppingSessionIds = ref(new Set<string>());

	async function stop(threadId: string): Promise<boolean> {
		if (!canExecute.value || stoppingSessionIds.value.has(threadId)) return false;
		stoppingSessionIds.value.add(threadId);
		try {
			await stopSession(rootStore.restApiContext, toValue(projectId), toValue(agentId), threadId);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSessions.showError.stop'));
			return false;
		} finally {
			stoppingSessionIds.value.delete(threadId);
		}
	}

	return { canStop: canExecute, stoppingSessionIds, stop };
}
