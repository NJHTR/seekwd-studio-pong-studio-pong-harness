import type { InstanceAiAdminSettingsResponse } from '@pong/api-types';

import { deriveInstanceAiConfiguration } from './useInstanceAiConfiguration';

function createSettings(
	overrides: Partial<InstanceAiAdminSettingsResponse> = {},
): InstanceAiAdminSettingsResponse {
	return {
		enabled: true,
		permissions: {} as InstanceAiAdminSettingsResponse['permissions'],
		mcpAccessEnabled: false,
		sandboxEnabled: false,
		sandboxProvider: 'pong-sandbox',
		daytonaCredentialId: null,
		pongSandboxCredentialId: null,
		searchCredentialId: null,
		modelCredentialId: null,
		modelName: null,
		modelEnvConfigured: false,
		sandboxEnvConfigured: false,
		searchEnvConfigured: false,
		searchDisabled: false,
		pongSandboxServiceUrl: null,
		envManaged: {
			model: { provider: false, apiKey: false, baseUrl: false, model: false },
			sandbox: { provider: false, serviceUrl: false, apiKey: false },
			search: { provider: false, apiKey: false, url: false },
		},
		browserUseEnabled: true,
		...overrides,
	};
}

describe('deriveInstanceAiConfiguration', () => {
	it('keeps setup incomplete until web search is explicitly decided', () => {
		const settings = createSettings({
			modelCredentialId: 'model-1',
			modelName: 'gpt-5.4',
			sandboxEnabled: true,
			pongSandboxCredentialId: 'sandbox-1',
		});

		const undecided = deriveInstanceAiConfiguration(settings, [], []);
		expect(undecided.setupCompleted).toBe(false);
		expect(undecided.searchState).toBe('notset');

		const disabled = deriveInstanceAiConfiguration({ ...settings, searchDisabled: true }, [], []);
		expect(disabled.setupCompleted).toBe(true);
		expect(disabled.searchState).toBe('disabled');
	});

	it('accepts env-managed services without exposing configuration details', () => {
		const configuration = deriveInstanceAiConfiguration(
			createSettings({
				modelEnvConfigured: true,
				sandboxEnabled: true,
				sandboxEnvConfigured: true,
				searchEnvConfigured: true,
			}),
			[],
			[],
		);

		expect(configuration).toMatchObject({
			modelConfigured: true,
			sandboxConfigured: true,
			searchState: 'env',
			setupCompleted: true,
		});
	});

	it('does not treat a configured sandbox connection as ready while sandboxing is disabled', () => {
		const configuration = deriveInstanceAiConfiguration(
			createSettings({ pongSandboxCredentialId: 'sandbox-1' }),
			[],
			[],
		);

		expect(configuration.sandboxConfigured).toBe(false);
	});
});
