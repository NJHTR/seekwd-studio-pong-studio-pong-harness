// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { GlobalConfig } from '@pong/config';
import { BackendModule } from '@pong/decorators';
import type { ModuleInterface } from '@pong/decorators';
import { Container } from '@pong/di';

@BackendModule({ name: 'mcp-discovery' })
export class McpDiscoveryModule implements ModuleInterface {
	async init() {
		if (Container.get(GlobalConfig).deployment.type !== 'cloud') return;
		const { McpDiscoveryActivityEvents } = await import('./activity-events.service.js');
		Container.get(McpDiscoveryActivityEvents).init();
		await import('./mcp-discovery.controller.js');
	}
}
// EOF Experiment cleanup
