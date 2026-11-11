import { Logger } from '@pong/backend-common';
import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';
import { Container } from '@pong/di';

import { inE2ETests } from '@/constants';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

@BackendModule({ name: 'mcp-registry' })
export class McpRegistryModule implements ModuleInterface {
	async init() {
		const { McpRegistryService } = await import('./registry/mcp-registry.service.js');
		await Container.get(McpRegistryService).init();

		await import('./mcp-registry.controller.js');

		if (inE2ETests) {
			await import('./mcp-registry-test.controller.js');
		}
	}

	async systemTasks() {
		if (inE2ETests) {
			return [];
		}

		const { McpRegistryRefreshTask } = await import('./mcp-registry-refresh.task.js');
		return [McpRegistryRefreshTask];
	}

	async entities() {
		const { McpRegistryServerEntity } = await import('./registry/mcp-registry-server.entity.js');
		return [McpRegistryServerEntity];
	}

	async nodeLoaders() {
		const { McpRegistryNodeLoader } = await import('./mcp-registry-node-loader.js');

		return [
			new McpRegistryNodeLoader(Container.get(LoadNodesAndCredentials), Container.get(Logger)),
		];
	}
}
