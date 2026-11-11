import { useCloudPlanStore } from '@pong/stores/cloudPlan.store';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useUsersStore } from '@pong/stores/users.store';
import { useEmptyStateDetection } from '@/features/workflows/readyToRun/composables/useEmptyStateDetection';
import { computed } from 'vue';

export function useSurfaceMcpToNewCloudUsersEligibility() {
	const usersStore = useUsersStore();
	const { isTrulyEmpty } = useEmptyStateDetection();
	const settingsStore = useSettingsStore();
	const cloudPlanStore = useCloudPlanStore();

	const isEligible = computed(
		() =>
			settingsStore.isCloudDeployment &&
			cloudPlanStore.userIsTrialing &&
			usersStore.isAdminOrOwner &&
			isTrulyEmpty(),
	);

	return {
		isEligible,
	};
}
