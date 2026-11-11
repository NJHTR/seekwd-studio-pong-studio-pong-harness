import { deriveInstanceAiSetupState, type InstanceAiSetupStateInput } from '../instance-ai.schema';

const unconfigured: InstanceAiSetupStateInput = {
	modelEnvConfigured: false,
	modelCredentialId: null,
	modelName: null,
	sandboxEnabled: false,
	sandboxEnvConfigured: false,
	sandboxProvider: 'pong-sandbox',
	daytonaCredentialId: null,
	pongSandboxCredentialId: null,
	searchCredentialId: null,
	searchEnvConfigured: false,
	searchDisabled: false,
};

describe('deriveInstanceAiSetupState', () => {
	it('reports everything as unconfigured and setup incomplete by default', () => {
		expect(deriveInstanceAiSetupState(unconfigured)).toEqual({
			modelSource: 'none',
			sandboxSource: 'none',
			sandboxType: null,
			sandboxCredentialId: null,
			webSearchSource: 'none',
			setupCompleted: false,
		});
	});

	it('reports UI sources and completion when every component has a credential', () => {
		expect(
			deriveInstanceAiSetupState({
				...unconfigured,
				modelCredentialId: 'model-cred',
				modelName: 'gpt-4',
				sandboxEnabled: true,
				sandboxProvider: 'daytona',
				daytonaCredentialId: 'day-cred',
				searchCredentialId: 'search-cred',
			}),
		).toEqual({
			modelSource: 'ui',
			sandboxSource: 'ui',
			sandboxType: 'daytona',
			sandboxCredentialId: 'day-cred',
			webSearchSource: 'ui',
			setupCompleted: true,
		});
	});

	it('reports env sources and completion for an env-var-only setup', () => {
		expect(
			deriveInstanceAiSetupState({
				...unconfigured,
				modelEnvConfigured: true,
				sandboxEnabled: true,
				sandboxEnvConfigured: true,
				searchEnvConfigured: true,
			}),
		).toEqual({
			modelSource: 'env',
			sandboxSource: 'env',
			sandboxType: 'pong-sandbox',
			sandboxCredentialId: null,
			webSearchSource: 'env',
			setupCompleted: true,
		});
	});

	it('does not count a model credential without a model name', () => {
		const state = deriveInstanceAiSetupState({
			...unconfigured,
			modelCredentialId: 'model-cred',
		});

		expect(state.modelSource).toBe('none');
		expect(state.setupCompleted).toBe(false);
	});

	it('does not count a sandbox credential for the unselected provider', () => {
		const state = deriveInstanceAiSetupState({
			...unconfigured,
			sandboxEnabled: true,
			sandboxProvider: 'daytona',
			pongSandboxCredentialId: 'sandbox-cred',
		});

		expect(state.sandboxSource).toBe('none');
		expect(state.sandboxCredentialId).toBeNull();
	});

	it('does not count a disabled sandbox as configured', () => {
		const state = deriveInstanceAiSetupState({
			...unconfigured,
			sandboxEnabled: false,
			daytonaCredentialId: 'day-cred',
			sandboxProvider: 'daytona',
		});

		expect(state.sandboxSource).toBe('none');
		expect(state.sandboxType).toBeNull();
	});

	it('treats an explicit web search opt-out as a decision that completes setup', () => {
		const state = deriveInstanceAiSetupState({
			...unconfigured,
			modelEnvConfigured: true,
			sandboxEnabled: true,
			sandboxEnvConfigured: true,
			searchDisabled: true,
		});

		expect(state.webSearchSource).toBe('disabled');
		expect(state.setupCompleted).toBe(true);
	});
});
