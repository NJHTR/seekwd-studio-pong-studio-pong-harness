import type {
	SelfHealingChatHandoff,
	SelfHealingChatInput,
	SelfHealingChatStartOutcome,
} from '@pong/frontend-module-sdk';
import { useI18n } from '@pong/i18n';
import { getResourcePermissions } from '@pong/permissions';
import { useUsersStore } from '@pong/stores/users.store';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useInstanceAiReady } from './useInstanceAiAvailability';
import { useInstanceAiHandoff } from './useInstanceAiHandoff';

export function useSelfHealingChatHandoff(): SelfHealingChatHandoff {
	const available = useInstanceAiReady();
	const { startThread } = useInstanceAiHandoff();
	const i18n = useI18n();
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();

	function canStart(projectId: string) {
		if (!available.value) return false;
		const projectScopes =
			projectsStore.myProjects.find((project) => project.id === projectId)?.scopes ?? [];
		const scopes = [...(usersStore.currentUser?.globalScopes ?? []), ...projectScopes];
		return !!getResourcePermissions(scopes).project.read;
	}

	async function start(
		projectId: string,
		result: SelfHealingChatInput,
	): Promise<SelfHealingChatStartOutcome> {
		if (!canStart(projectId)) return 'unavailable';

		const messageParts = [i18n.baseText('inbox.selfHealing.chat.prompt')];
		if (result.reviewState === 'applied') {
			messageParts.push(i18n.baseText('inbox.selfHealing.chat.appliedContext'));
		}
		messageParts.push(result.report);

		const message = messageParts.join('\n\n');
		const outcome = await startThread(
			projectId,
			message,
			{ kind: 'prefill', prefillType: 'handoff_self_healing_report' },
			{
				source: 'self_healing_result',
				origin: 'internal',
				sourceContext: { resultId: result.resultId, outcome: result.outcome },
			},
			[
				{
					type: 'workflow',
					id: result.workflowId,
					...(result.execution.status === 'available' ? { executionId: result.execution.id } : {}),
				},
			],
		);
		return outcome === 'setup' ? 'unavailable' : outcome;
	}

	return { available, canStart, start };
}
