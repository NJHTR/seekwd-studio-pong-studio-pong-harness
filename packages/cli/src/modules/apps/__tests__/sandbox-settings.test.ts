import { GlobalConfig, type AgentsConfig, type InstanceAiConfig } from '@pong/config';
import { Container } from '@pong/di';
import { mock, mockReset } from 'vitest-mock-extended';

import { PONG_VERSION } from '@/constants';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { resolveAppSandboxConfig } from '../sandbox-settings';

describe('resolveAppSandboxConfig', () => {
	const settings = mock<SandboxSettingsService>();
	const config = mock<InstanceAiConfig>();
	const agentsConfig = mock<AgentsConfig>({
		sandboxImage: 'agent-image',
		sandboxSnapshot: 'agent-snapshot',
		sandboxTimeout: 60_000,
	});
	const globalConfig = mock<GlobalConfig>({ instanceAi: config, agents: agentsConfig });

	beforeEach(() => {
		mockReset(settings);
		agentsConfig.sandboxEnabled = false;
		config.sandboxEnabled = true;
		config.sandboxImage = 'test-image';
		config.sandboxSnapshot = 'test-snapshot';
		config.sandboxTimeout = 120_000;
		settings.isAgentSandboxEnabled.mockReturnValue(true);
		settings.getProvider.mockReturnValue('daytona');
		settings.resolveDaytonaSandboxConfig.mockResolvedValue({
			daytonaApiUrl: 'https://daytona.example.com/api',
			daytonaApiKey: 'daytona-key',
			image: 'test-image',
			snapshot: 'test-snapshot',
		});
		settings.resolvePongSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
		});
		Container.set(GlobalConfig, globalConfig);
		Container.set(SandboxSettingsService, settings);
	});

	afterEach(() => Container.reset());

	it.each(['daytona', 'pong-sandbox'] as const)(
		'disables %s when only Agent sandboxes are enabled',
		async (provider) => {
			settings.getProvider.mockReturnValue(provider);
			agentsConfig.sandboxEnabled = true;
			config.sandboxEnabled = false;

			await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
				enabled: false,
				provider,
			});
			expect(settings.registerCredentialUses).not.toHaveBeenCalled();
			expect(settings.resolveDaytonaSandboxConfig).not.toHaveBeenCalled();
			expect(settings.resolvePongSandboxConfig).not.toHaveBeenCalled();
		},
	);

	it.each(['daytona', 'pong-sandbox'] as const)(
		'resolves %s connections for cleanup when sandboxes are disabled',
		async (provider) => {
			settings.getProvider.mockReturnValue(provider);
			const connection = await resolveAppSandboxConfig('project');
			config.sandboxEnabled = false;

			await expect(resolveAppSandboxConfig('project', { checkEnabled: false })).resolves.toEqual(
				connection,
			);
		},
	);

	it.each(['daytona', 'pong-sandbox'] as const)(
		'keeps %s disabled for cleanup when its connection is missing',
		async (provider) => {
			settings.getProvider.mockReturnValue(provider);
			config.sandboxEnabled = false;
			settings.resolveDaytonaSandboxConfig.mockResolvedValue({});
			settings.resolvePongSandboxConfig.mockResolvedValue({});

			await expect(resolveAppSandboxConfig('project', { checkEnabled: false })).resolves.toEqual({
				enabled: false,
				provider,
			});
		},
	);

	it('uses Instance AI settings when Agent sandboxes are disabled', async () => {
		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://daytona.example.com/api',
			daytonaApiKey: 'daytona-key',
			image: 'test-image',
			snapshot: 'test-snapshot',
			timeout: 120_000,
		});
		expect(settings.registerCredentialUses).toHaveBeenCalledOnce();
		expect(settings.resolveDaytonaSandboxConfig).toHaveBeenCalledExactlyOnceWith('project', {
			image: 'test-image',
			snapshot: 'test-snapshot',
			fallbackSnapshot: `pong/instance-ai:${PONG_VERSION}`,
		});
		expect(settings.resolvePongSandboxConfig).not.toHaveBeenCalled();
	});

	it.each([undefined, ''])('disables Daytona when its API key is %s', async (apiKey) => {
		settings.resolveDaytonaSandboxConfig.mockResolvedValue({
			daytonaApiUrl: 'https://daytona.example.com/api',
			daytonaApiKey: apiKey,
		});

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: false,
			provider: 'daytona',
		});
		expect(settings.resolvePongSandboxConfig).not.toHaveBeenCalled();
	});

	it('enables the Daytona proxy without a local API key', async () => {
		const getAuthToken = vi.fn(async () => 'proxy-token');
		settings.resolveDaytonaSandboxConfig.mockResolvedValue({
			daytonaApiUrl: 'https://proxy.example.com',
			snapshot: 'test-snapshot',
			getAuthToken,
		});

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example.com',
			snapshot: 'test-snapshot',
			getAuthToken,
			timeout: 120_000,
		});
	});

	it('resolves the pong sandbox credentials and timeout', async () => {
		settings.getProvider.mockReturnValue('pong-sandbox');

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 120_000,
		});
		expect(settings.registerCredentialUses).toHaveBeenCalledOnce();
		expect(settings.resolvePongSandboxConfig).toHaveBeenCalledOnce();
		expect(settings.resolveDaytonaSandboxConfig).not.toHaveBeenCalled();
	});

	it.each([undefined, ''])('disables the pong sandbox when its URL is %s', async (serviceUrl) => {
		settings.getProvider.mockReturnValue('pong-sandbox');
		settings.resolvePongSandboxConfig.mockResolvedValue({ serviceUrl, apiKey: 'sandbox-key' });

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: false,
			provider: 'pong-sandbox',
		});
		expect(settings.resolveDaytonaSandboxConfig).not.toHaveBeenCalled();
	});

	it('allows an pong sandbox service without an API key', async () => {
		settings.getProvider.mockReturnValue('pong-sandbox');
		settings.resolvePongSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://sandbox.example.com',
		});

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: undefined,
			timeout: 120_000,
		});
	});
});
