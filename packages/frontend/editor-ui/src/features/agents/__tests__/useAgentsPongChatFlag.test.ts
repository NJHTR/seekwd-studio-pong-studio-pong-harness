import { AGENTS_PONG_CHAT_FLAG } from '@pong/api-types';
import { useSettingsStore } from '@pong/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import { usePostHog } from '@/app/stores/posthog.store';
import { useAgentsPongChatFlag, useAgentsPongChatVariant } from '../composables/useAgentsPongChatFlag';

describe('useAgentsPongChatFlag', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it.each([
		['variant', true],
		['variant-b', true],
		['control', false],
		[true, false],
		[false, false],
		[undefined, false],
	])('returns %s → %s', (value, expected) => {
		const posthog = usePostHog();
		posthog.overrides = value === undefined ? {} : { [AGENTS_PONG_CHAT_FLAG]: { value } };
		expect(useAgentsPongChatFlag().value).toBe(expected);
	});
});

describe('useAgentsPongChatVariant', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useSettingsStore().settings.activeModules = ['agents'];
	});

	it.each([
		['variant-a', true, false],
		['variant-b', false, true],
		['control', false, false],
		[undefined, false, false],
	])('for %s, isVariantA=%s and isVariantB=%s', (value, expectedA, expectedB) => {
		const posthog = usePostHog();
		posthog.overrides = value === undefined ? {} : { [AGENTS_PONG_CHAT_FLAG]: { value } };
		const { isVariantA, isVariantB } = useAgentsPongChatVariant();
		expect(isVariantA.value).toBe(expectedA);
		expect(isVariantB.value).toBe(expectedB);
	});

	it('turns both variants off while the agents module is inactive', () => {
		useSettingsStore().settings.activeModules = [];
		usePostHog().overrides = { [AGENTS_PONG_CHAT_FLAG]: { value: 'variant-a' } };
		const { isVariantA, isVariantB } = useAgentsPongChatVariant();
		expect(isVariantA.value).toBe(false);
		expect(isVariantB.value).toBe(false);
	});

	it('turns both variants off while Agents is turned off in the settings', () => {
		useSettingsStore().moduleSettings = {
			agents: { enabled: false, modules: [], knowledgeBaseEnabled: false, proxyEnabled: false },
		};
		usePostHog().overrides = { [AGENTS_PONG_CHAT_FLAG]: { value: 'variant-b' } };
		const { isVariantA, isVariantB } = useAgentsPongChatVariant();
		expect(isVariantA.value).toBe(false);
		expect(isVariantB.value).toBe(false);
	});
});
