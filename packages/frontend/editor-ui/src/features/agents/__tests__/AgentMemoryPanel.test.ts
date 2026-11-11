import { MANAGED_CREDENTIAL_TOKEN } from '@pong/api-types';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

import { defaultSettings } from '@pong/frontend-test-utils';
import { useSettingsStore } from '@pong/stores/settings.store';
import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@pong/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@pong/design-system', () => ({
	PongButton: {
		template:
			'<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
		props: ['disabled'],
		emits: ['click'],
	},
	PongDialog: {
		template: '<div v-if="open"><slot /></div>',
		props: ['open'],
	},
	PongDialogHeader: { template: '<div><slot /></div>' },
	PongDialogBody: { template: '<div><slot /></div>' },
	PongDialogTitle: { template: '<div><slot /></div>' },
	PongIconButton: {
		template:
			'<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\')" />',
		props: ['disabled'],
		emits: ['click'],
	},
	PongSwitch: {
		template:
			'<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'update:modelValue\', !modelValue)" />',
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
	},
	PongText: { template: '<span><slot /></span>', props: ['bold', 'size', 'color'] },
}));

vi.mock('@/features/credentials/components/CredentialPicker/CredentialPicker.vue', () => ({
	default: {
		name: 'CredentialPicker',
		template: '<div />',
		props: {
			credentialType: String,
			selectedCredentialId: { type: String, default: null },
			hideCreateNew: Boolean,
			teleported: Boolean,
			credentialModalAppendToBody: Boolean,
		},
		emits: ['credential-selected'],
	},
}));

vi.mock('../components/AgentMemoryGuidanceModal.vue', () => ({
	default: {
		name: 'AgentMemoryGuidanceModal',
		template: '<div />',
		props: ['open', 'guidance', 'disabled'],
		emits: ['update:open', 'save'],
	},
}));

vi.mock('../composables/useAgentProjectId', () => ({
	useAgentProjectId: () => computed(() => 'project-1'),
}));

function baseConfig(): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		memory: { enabled: true, storage: 'pong' },
	};
}

function mountPanel({
	proxyEnabled,
	config = baseConfig(),
}: {
	proxyEnabled: boolean;
	config?: AgentJsonConfig;
}) {
	createTestingPinia({ createSpy: vi.fn, stubActions: false });
	const settingsStore = useSettingsStore();
	settingsStore.setSettings({
		...defaultSettings,
		aiAssistant: { enabled: true, setup: true, cloudUbbEnabled: false },
	});
	settingsStore.moduleSettings = {
		agents: {
			modules: [],
			knowledgeBaseEnabled: false,
			proxyEnabled,
		},
	};

	return mount(AgentMemoryPanel, {
		props: {
			config,
		},
	});
}

describe('AgentMemoryPanel', () => {
	it('enables episodic memory with managed credentials when the proxy is available', async () => {
		const wrapper = mountPanel({ proxyEnabled: true });

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'pong',
						episodicMemory: {
							enabled: true,
							credential: MANAGED_CREDENTIAL_TOKEN,
						},
					},
				},
			],
		]);
	});

	it('opens the credential picker without enabling episodic memory when the proxy is unavailable', async () => {
		const wrapper = mountPanel({ proxyEnabled: false });

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(wrapper.findComponent({ name: 'CredentialPicker' }).exists()).toBe(true);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('shows an OpenAI credential picker that allows creating a credential for self-hosting', async () => {
		const wrapper = mountPanel({ proxyEnabled: false });

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		const picker = wrapper.findComponent({ name: 'CredentialPicker' });
		expect(picker.props()).toMatchObject({
			credentialType: 'openAiApi',
			selectedCredentialId: null,
			hideCreateNew: false,
			teleported: true,
			credentialModalAppendToBody: true,
		});
	});

	it('enables episodic memory after selecting a self-hosted credential', async () => {
		const wrapper = mountPanel({ proxyEnabled: false });
		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		wrapper
			.findComponent({ name: 'CredentialPicker' })
			.vm.$emit('credential-selected', 'openai-credential');
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'pong',
						episodicMemory: {
							enabled: true,
							credential: 'openai-credential',
						},
					},
				},
			],
		]);
		expect(wrapper.findComponent({ name: 'CredentialPicker' }).exists()).toBe(false);
	});

	it('requires a new credential selection when episodic memory is enabled again', async () => {
		const config = baseConfig();
		config.memory = {
			enabled: true,
			storage: 'pong',
			episodicMemory: {
				enabled: true,
				credential: 'existing-credential',
			},
		};
		const wrapper = mountPanel({ proxyEnabled: false, config });

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');
		expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
			memory: { episodicMemory: { enabled: false } },
		});

		await wrapper.setProps({
			config: {
				...config,
				memory: {
					...config.memory,
					episodicMemory: { enabled: false },
				},
			},
		});
		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		const picker = wrapper.findComponent({ name: 'CredentialPicker' });
		expect(picker.props('selectedCredentialId')).toBeNull();
		expect(wrapper.emitted('update:config')).toHaveLength(1);
	});

	it('changes the credential without resetting the episodic memory settings', async () => {
		const config = baseConfig();
		config.memory = {
			enabled: true,
			storage: 'pong',
			episodicMemory: {
				enabled: true,
				credential: 'existing-credential',
				reflectorModel: {
					model: 'openai/gpt-4.1-mini',
					credential: 'reflector-credential',
				},
				topK: 8,
				maxEntriesPerRun: 4,
			},
		};
		const wrapper = mountPanel({ proxyEnabled: false, config });

		await wrapper.find('[data-testid="agent-episodic-memory-change-credential"]').trigger('click');

		const picker = wrapper.findComponent({ name: 'CredentialPicker' });
		expect(picker.props('selectedCredentialId')).toBe('existing-credential');
		picker.vm.$emit('credential-selected', 'replacement-credential');
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'pong',
						episodicMemory: {
							enabled: true,
							credential: 'replacement-credential',
							reflectorModel: {
								model: 'openai/gpt-4.1-mini',
								credential: 'reflector-credential',
							},
							topK: 8,
							maxEntriesPerRun: 4,
						},
					},
				},
			],
		]);
	});
	describe('capture guidance', () => {
		function configWithGuidance(): AgentJsonConfig {
			const config = baseConfig();
			config.memory = {
				enabled: true,
				storage: 'pong',
				episodicMemory: {
					enabled: true,
					credential: 'existing-credential',
					topK: 8,
					guidance: { include: ['timezone'], exclude: [] },
				},
			};
			return config;
		}

		it('shows the guidance button only when episodic memory is enabled', () => {
			const disabled = mountPanel({ proxyEnabled: true });
			expect(disabled.find('[data-testid="agent-episodic-memory-guidance-open"]').exists()).toBe(
				false,
			);

			const enabled = mountPanel({ proxyEnabled: true, config: configWithGuidance() });
			expect(enabled.find('[data-testid="agent-episodic-memory-guidance-open"]').exists()).toBe(
				true,
			);
		});

		it('opens the modal with saved guidance and saves changes without resetting settings', async () => {
			const wrapper = mountPanel({ proxyEnabled: true, config: configWithGuidance() });
			const modal = wrapper.findComponent({ name: 'AgentMemoryGuidanceModal' });
			expect(modal.props('open')).toBe(false);

			await wrapper.find('[data-testid="agent-episodic-memory-guidance-open"]').trigger('click');
			expect(modal.props('open')).toBe(true);
			expect(modal.props('guidance')).toEqual({ include: ['timezone'], exclude: [] });

			modal.vm.$emit('save', { include: ['timezone'], exclude: ['passwords'] });
			modal.vm.$emit('save', undefined);

			const episodicMemory = { enabled: true, credential: 'existing-credential', topK: 8 };
			expect(wrapper.emitted('update:config')).toEqual([
				[
					{
						memory: {
							enabled: true,
							storage: 'pong',
							episodicMemory: {
								...episodicMemory,
								guidance: { include: ['timezone'], exclude: ['passwords'] },
							},
						},
					},
				],
				[{ memory: { enabled: true, storage: 'pong', episodicMemory } }],
			]);
		});
	});
});
