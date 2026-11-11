import { Container } from '@pong/di';

import type { QuickConnectConfig } from '../quick-connect.config';
import { QuickConnectModule } from '../quick-connect.module';

describe('QuickConnectModule', () => {
	let module: QuickConnectModule;

	beforeEach(() => {
		Container.reset();
		module = new QuickConnectModule();
	});

	afterEach(() => {
		delete process.env.PONG_QUICK_CONNECT_OPTIONS;
	});

	describe('settings()', () => {
		it('should not expose backendFlowConfig', async () => {
			const testConfig = [
				{
					packageName: '@pong/test-service',
					credentialType: 'testApi',
					text: 'Test Service Integration',
					quickConnectType: 'firecrawl',
					consentText: 'Allow access to your account?',
					backendFlowConfig: {
						secret: 'super-secret-key-that-should-never-be-exposed',
					},
				},
			];
			process.env.PONG_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			const settings = (await module.settings()) as QuickConnectConfig;

			expect(settings.options).toHaveLength(1);
			expect(settings.options[0].backendFlowConfig).toBeUndefined();
		});

		it('should return empty options when no config is set', async () => {
			const settings = await module.settings();

			expect(settings.options).toEqual([]);
		});

		it('should handle options without backendFlowConfig', async () => {
			const testConfig = [
				{
					packageName: '@pong/oauth-service',
					credentialType: 'oauthApi',
					text: 'OAuth Service Integration',
					quickConnectType: 'oauth',
				},
			];
			process.env.PONG_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			const settings = (await module.settings()) as QuickConnectConfig;

			expect(settings.options).toHaveLength(1);
			expect(settings.options[0].backendFlowConfig).toBeUndefined();
			expect(settings.options[0].packageName).toBe('@pong/oauth-service');
		});

		it('should handle mixed options with and without backendFlowConfig', async () => {
			const testConfig = [
				{
					packageName: '@pong/backend-service',
					credentialType: 'backendApi',
					text: 'Backend Service Integration',
					quickConnectType: 'firecrawl',
					consentText: 'Grant access?',
					backendFlowConfig: {
						secret: 'secret-that-must-be-hidden',
					},
				},
				{
					packageName: '@pong/frontend-service',
					credentialType: 'frontendApi',
					text: 'Frontend Service Integration',
					quickConnectType: 'oauth',
				},
			];
			process.env.PONG_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			const settings = (await module.settings()) as QuickConnectConfig;

			expect(settings.options).toHaveLength(2);
			expect(settings.options[0].backendFlowConfig).toBeUndefined();
			expect(settings.options[1].backendFlowConfig).toBeUndefined();
		});

		it('should return all non-sensitive option fields', async () => {
			const testConfig = [
				{
					packageName: '@pong/test-service',
					credentialType: 'testApi',
					text: 'Test Service Integration',
					quickConnectType: 'firecrawl',
					consentText: 'Grant access?',
					backendFlowConfig: {
						secret: 'secret-key',
					},
				},
			];
			process.env.PONG_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			const settings = await module.settings();

			const option = settings.options[0];
			expect(option.packageName).toBe('@pong/test-service');
			expect(option.credentialType).toBe('testApi');
			expect(option.text).toBe('Test Service Integration');
			expect(option.quickConnectType).toBe('firecrawl');
			expect(option.consentText).toBe('Grant access?');
		});

		it('should strip secret from multiple options with backendFlowConfig', async () => {
			const testConfig = [
				{
					packageName: '@pong/service-1',
					credentialType: 'api1',
					text: 'Service 1',
					quickConnectType: 'firecrawl',
					consentText: 'Consent 1',
					backendFlowConfig: {
						secret: 'secret-1',
					},
				},
				{
					packageName: '@pong/service-2',
					credentialType: 'api2',
					text: 'Service 2',
					quickConnectType: 'firecrawl',
					consentText: 'Consent 2',
					backendFlowConfig: {
						secret: 'secret-2',
					},
				},
			];
			process.env.PONG_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

			const settings = (await module.settings()) as QuickConnectConfig;

			expect(settings.options).toHaveLength(2);
			expect(settings.options[0].backendFlowConfig).toBeUndefined();
			expect(settings.options[1].backendFlowConfig).toBeUndefined();
		});
	});
});
