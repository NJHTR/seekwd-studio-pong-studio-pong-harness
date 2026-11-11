import type { AgentIntegrationConfig } from '@pong/api-types';

import { resolveImportedChannels } from '../resolve-imported-channels';

const sourceSlack = {
	type: 'slack',
	credentialId: 'source-slack',
	settings: { messagingExperience: 'agent', onlyRespondWhenMentioned: true },
	approval: { mode: 'global' },
} satisfies AgentIntegrationConfig;

describe('resolveImportedChannels', () => {
	it('reuses the destination connection and applies the source settings', () => {
		const destination: AgentIntegrationConfig[] = [
			{ type: 'slack', credentialId: 'destination-slack' },
		];

		expect(resolveImportedChannels(destination, [sourceSlack])).toEqual({
			integrations: [{ ...sourceSlack, credentialId: 'destination-slack' }],
			channels: [{ type: 'slack', status: 'reused' }],
		});
	});

	it('keeps a new channel as a draft that needs setup', () => {
		expect(resolveImportedChannels([], [sourceSlack])).toEqual({
			integrations: [{ ...sourceSlack, credentialId: '' }],
			channels: [{ type: 'slack', status: 'setup-required', reason: 'new-channel' }],
		});
	});

	it('does not reuse a destination draft', () => {
		const destination: AgentIntegrationConfig[] = [{ type: 'slack', credentialId: '' }];

		expect(resolveImportedChannels(destination, [sourceSlack]).channels).toEqual([
			{ type: 'slack', status: 'setup-required', reason: 'destination-draft' },
		]);
	});

	it('does not treat a matching source credential as destination setup', () => {
		const { integrations } = resolveImportedChannels([], [sourceSlack]);

		expect(integrations[0].credentialId).toBe('');
	});

	it('pairs several connections of one type in order', () => {
		const destination: AgentIntegrationConfig[] = [
			{ type: 'slack', credentialId: 'destination-slack' },
		];
		const second = { ...sourceSlack, credentialId: 'source-slack-2' };

		const result = resolveImportedChannels(destination, [sourceSlack, second]);

		expect(result.integrations.map(({ credentialId }) => credentialId)).toEqual([
			'destination-slack',
			'',
		]);
		expect(result.channels).toEqual([
			{ type: 'slack', status: 'reused' },
			{ type: 'slack', status: 'setup-required', reason: 'new-channel' },
		]);
	});

	it('removes destination channels that the source does not have', () => {
		const destination: AgentIntegrationConfig[] = [
			{ type: 'telegram', credentialId: 'destination-telegram' },
		];

		expect(resolveImportedChannels(destination, [])).toEqual({ integrations: [], channels: [] });
	});

	it('passes pong Chat through without a channel result', () => {
		const pongChat: AgentIntegrationConfig = { type: 'pong_chat', credentialId: '' };

		expect(resolveImportedChannels([], [pongChat])).toEqual({
			integrations: [pongChat],
			channels: [],
		});
	});
});
