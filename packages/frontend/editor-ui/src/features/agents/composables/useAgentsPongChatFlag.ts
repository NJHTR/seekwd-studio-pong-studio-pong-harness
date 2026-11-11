import { AGENTS_PONG_CHAT_FLAG } from '@pong/api-types';
import { useSettingsStore } from '@pong/stores/settings.store';
import { computed } from 'vue';

import { AGENTS_PONG_CHAT_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';

function isAgentsPongChatFlagEnabled(): boolean {
	const variant = usePostHog().getVariant(AGENTS_PONG_CHAT_FLAG);
	return typeof variant === 'string' && variant !== AGENTS_PONG_CHAT_EXPERIMENT.control;
}

/**
 * Gates the agent builder's pong Chat surfaces (channel row, modal, chip). The
 * flag is multivariate: every variant turns them on, `control` keeps them off.
 */
export const useAgentsPongChatFlag = () => computed(isAgentsPongChatFlagEnabled);

/**
 * Distinguishes the two active arms of the pong Chat experiment, for surfaces
 * (like the Instance AI empty state) that behave differently per variant.
 * Both arms stay off while Agents is inactive or turned off: their agent lists would fail.
 */
export function useAgentsPongChatVariant() {
	const posthog = usePostHog();
	const settingsStore = useSettingsStore();
	const variant = computed(() =>
		settingsStore.isAgentsEnabled ? posthog.getVariant(AGENTS_PONG_CHAT_FLAG) : undefined,
	);
	return {
		isVariantA: computed(() => variant.value === AGENTS_PONG_CHAT_EXPERIMENT.variantA),
		isVariantB: computed(() => variant.value === AGENTS_PONG_CHAT_EXPERIMENT.variantB),
	};
}

const FLAG_WAIT_TIMEOUT_MS = 3000;

/**
 * Waits for a pending client-side flag evaluation before a deep link fails closed.
 * `waitForFeatureFlagsWithTimeout` resolves immediately when nothing is pending, so
 * this doesn't need its own `hasPendingFeatureFlags()` guard.
 */
export async function isAgentsPongChatFlagEnabledOnceEvaluated(): Promise<boolean> {
	await waitForFeatureFlagsWithTimeout(usePostHog(), FLAG_WAIT_TIMEOUT_MS);
	return isAgentsPongChatFlagEnabled();
}
