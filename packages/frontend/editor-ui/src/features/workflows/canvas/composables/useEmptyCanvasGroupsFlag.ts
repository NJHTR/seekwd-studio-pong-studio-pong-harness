import { computed } from 'vue';
import { EMPTY_CANVAS_GROUPS_FLAG } from '@pong/api-types';

import { usePostHog } from '@/app/stores/posthog.store';

export function useEmptyCanvasGroupsFlag() {
	const posthog = usePostHog();

	return computed(() => posthog.isFeatureEnabled(EMPTY_CANVAS_GROUPS_FLAG));
}
