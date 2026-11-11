import { Logger } from '@pong/backend-common';
import { InstanceSettingsLoaderConfig } from '@pong/config';
import { Service } from '@pong/di';

import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';

@Service()
export class McpSettingsLoader {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly mcpSettingsService: McpSettingsService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		const { mcpManagedByEnv, mcpAccessEnabled } = this.instanceSettingsLoaderConfig;
		if (!mcpManagedByEnv) {
			this.logger.debug('mcpManagedByEnv is disabled — skipping MCP env vars');
			return 'skipped';
		}

		this.logger.info('mcpManagedByEnv is enabled — applying MCP env vars');

		await this.mcpSettingsService.setEnabled(mcpAccessEnabled);

		return 'created';
	}
}
