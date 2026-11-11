/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import {
	ADVANCED_SECTION_KEY,
	AGENT_SECTION_KEY,
	CONFIG_JSON_SECTION_KEY,
	EXECUTIONS_SECTION_KEY,
} from '../constants';
import type { AgentJsonConfig } from '../types';
import AgentConfigTree from '../components/AgentConfigTree.vue';

vi.mock('@pong/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const globalStubs = {
	PongBadge: { template: '<span><slot /></span>' },
	PongIcon: { template: '<span />', props: ['icon', 'size'] },
	PongText: { template: '<span><slot /></span>', props: ['tag', 'size'] },
};

function makeConfig(overrides: Record<string, unknown> = {}): AgentJsonConfig {
	return {
		name: 'Template agent',
		description: 'Built from a template',
		model: 'anthropic/claude-sonnet-4-5',
		credential: 'credential',
		instructions: 'Help with the requested task.',
		memory: { enabled: true, storage: 'pong' },
		tools: [{ type: 'workflow', workflow: 'Daily Summary' }],
		skills: [
			{ type: 'skill', id: 'summarize_notes' },
			{ type: 'skill', id: 'summarize_notes' },
		],
		config: { toolCallConcurrency: 2 },
		providerTools: { 'anthropic.web_search': { maxUses: 5 } },
		...overrides,
	} as unknown as AgentJsonConfig;
}

describe('AgentConfigTree', () => {
	it('renders only curated sidebar sections, not raw config artifacts', () => {
		const wrapper = mount(AgentConfigTree, {
			props: {
				config: makeConfig({ artifacts: { source: 'builder' } }),
				selectedKey: AGENT_SECTION_KEY,
				connectedTriggers: ['slack'],
				executionsCount: 3,
			},
			global: { stubs: globalStubs },
		});

		const keys = wrapper
			.findAll('[data-testid="agent-config-tree-item"]')
			.map((item) => item.attributes('data-key'));

		expect(keys).toEqual([
			AGENT_SECTION_KEY,
			ADVANCED_SECTION_KEY,
			'memory',
			'triggers',
			'tools',
			'skills',
			EXECUTIONS_SECTION_KEY,
			CONFIG_JSON_SECTION_KEY,
		]);
	});
});
