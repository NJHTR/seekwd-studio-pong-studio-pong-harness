import { LlmJudgeProviderRegistry } from '../llm-judge-provider-registry';

describe('LlmJudgeProviderRegistry (fixed-list)', () => {
	const registry = new LlmJudgeProviderRegistry();

	it('exposes the canonical chat-model providers shipped by @pong/nodes-langchain', () => {
		const expectedNodeTypes = [
			'@pong/nodes-langchain.lmChatOpenAi',
			'@pong/nodes-langchain.lmChatAnthropic',
			'@pong/nodes-langchain.lmChatGoogleGemini',
			'@pong/nodes-langchain.lmChatGoogleVertex',
			'@pong/nodes-langchain.lmChatAzureOpenAi',
			'@pong/nodes-langchain.lmChatAwsBedrock',
			'@pong/nodes-langchain.lmChatOllama',
			'@pong/nodes-langchain.lmChatVercelAiGateway',
			'@pong/nodes-langchain.lmChatXAiGrok',
			'@pong/nodes-langchain.lmChatGroq',
			'@pong/nodes-langchain.lmChatOpenRouter',
			'@pong/nodes-langchain.lmChatDeepSeek',
			'@pong/nodes-langchain.lmChatCohere',
			'@pong/nodes-langchain.lmChatMistralCloud',
			'@pong/nodes-langchain.lmChatAlibabaCloud',
			'@pong/nodes-langchain.lmChatMinimax',
			'@pong/nodes-langchain.lmChatMoonshot',
			'@pong/nodes-langchain.lmChatLemonade',
		];
		const actual = registry.listProviders().map((p) => p.nodeType);
		expect(actual.sort()).toEqual([...expectedNodeTypes].sort());
	});

	describe('shape', () => {
		it('every entry has nodeType, displayName, and a non-empty credentialTypes array', () => {
			for (const entry of registry.listProviders()) {
				expect(entry.nodeType).toMatch(/^@pong\/nodes-langchain\./);
				expect(typeof entry.displayName).toBe('string');
				expect(entry.displayName.length).toBeGreaterThan(0);
				expect(Array.isArray(entry.credentialTypes)).toBe(true);
				expect(entry.credentialTypes.length).toBeGreaterThan(0);
				for (const cred of entry.credentialTypes) {
					expect(typeof cred.name).toBe('string');
					expect(cred.name.length).toBeGreaterThan(0);
					expect(typeof cred.displayName).toBe('string');
					expect(cred.displayName.length).toBeGreaterThan(0);
				}
			}
		});
	});

	describe('get(nodeType)', () => {
		it('returns the matching entry for a known provider', () => {
			const entry = registry.get('@pong/nodes-langchain.lmChatOpenAi');
			expect(entry).toBeDefined();
			expect(entry?.displayName).toBe('OpenAI Chat Model');
			expect(entry?.credentialTypes.map((c) => c.name)).toContain('openAiApi');
		});

		it('returns undefined for unknown providers', () => {
			expect(registry.get('@pong/nodes-langchain.lmChatNotARealNode')).toBeUndefined();
		});

		it('exposes Azure OpenAI with both api-key and Entra credential variants', () => {
			const entry = registry.get('@pong/nodes-langchain.lmChatAzureOpenAi');
			const credNames = entry?.credentialTypes.map((c) => c.name) ?? [];
			expect(credNames).toEqual(
				expect.arrayContaining(['azureOpenAiApi', 'azureEntraCognitiveServicesOAuth2Api']),
			);
		});
	});

	describe('getByCredentialType(credentialType)', () => {
		it('resolves the provider selected by a credential type', () => {
			expect(registry.getByCredentialType('openAiApi')?.nodeType).toBe(
				'@pong/nodes-langchain.lmChatOpenAi',
			);
			expect(registry.getByCredentialType('anthropicApi')?.nodeType).toBe(
				'@pong/nodes-langchain.lmChatAnthropic',
			);
		});

		it('resolves both Azure credential variants to the Azure provider', () => {
			expect(registry.getByCredentialType('azureOpenAiApi')?.nodeType).toBe(
				'@pong/nodes-langchain.lmChatAzureOpenAi',
			);
			expect(registry.getByCredentialType('azureEntraCognitiveServicesOAuth2Api')?.nodeType).toBe(
				'@pong/nodes-langchain.lmChatAzureOpenAi',
			);
		});

		it('returns undefined for an unknown credential type', () => {
			expect(registry.getByCredentialType('notARealCredential')).toBeUndefined();
		});

		it('maps every credential type to exactly one provider (unique keys)', () => {
			const seen = new Set<string>();
			for (const p of registry.listProviders()) {
				for (const c of p.credentialTypes) {
					expect(seen.has(c.name)).toBe(false);
					seen.add(c.name);
				}
			}
		});
	});

	describe('listProviders() referential stability', () => {
		it('returns the same array reference across calls (cheap snapshot)', () => {
			expect(registry.listProviders()).toBe(registry.listProviders());
		});
	});
});
