import type { SandboxConfig } from '@pong/agents/sandbox';
import type { AppSandboxResolveOptions } from '@pong/backend-module-apps';
import { GlobalConfig } from '@pong/config';
import { Container } from '@pong/di';

import { PONG_VERSION } from '@/constants';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

export async function resolveAppSandboxConfig(
	projectId: string,
	{ checkEnabled = true }: AppSandboxResolveOptions = {},
): Promise<SandboxConfig> {
	const settings = Container.get(SandboxSettingsService);
	const provider = settings.getProvider();
	const config = Container.get(GlobalConfig).instanceAi;
	if (checkEnabled && !config.sandboxEnabled) return { enabled: false, provider };

	settings.registerCredentialUses();
	if (provider === 'daytona') {
		const connection = await settings.resolveDaytonaSandboxConfig(projectId, {
			image: config.sandboxImage || undefined,
			snapshot: config.sandboxSnapshot,
			fallbackSnapshot: PONG_VERSION ? `pong/instance-ai:${PONG_VERSION}` : undefined,
		});
		if (!connection.daytonaApiKey && !connection.getAuthToken)
			return { enabled: false, provider: 'daytona' };
		return {
			...connection,
			enabled: true,
			provider: 'daytona',
			timeout: config.sandboxTimeout,
		};
	}
	const credentials = await settings.resolvePongSandboxConfig();
	if (!credentials.serviceUrl) return { enabled: false, provider: 'pong-sandbox' };
	return {
		enabled: true,
		provider: 'pong-sandbox',
		serviceUrl: credentials.serviceUrl,
		apiKey: credentials.apiKey,
		timeout: config.sandboxTimeout,
	};
}
