import type { AgentJsonToolConfig } from '@pong/api-types';
import { Service } from '@pong/di';

import { NodeTypesProxy } from '@pong/backend-services';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { reconcileNodeToolGatewayCredentials } from './reconcile-node-tool-gateway-credentials';

/**
 * Composes node descriptions with the gateway config to auto-assign pong Connect
 * managed credentials to node tools. Keeps node type lookups out of the config service
 * and agent-config shape out of the generic `AiGatewayService`.
 */
@Service()
export class NodeToolAiGatewayService {
	constructor(
		private readonly nodeTypes: NodeTypesProxy,
		private readonly aiGatewayService: AiGatewayService,
	) {}

	async assignManagedCredentials(
		tools: AgentJsonToolConfig[] | undefined,
		ownedCredentialTypes: ReadonlySet<string>,
	): Promise<void> {
		if (tools === undefined) return;
		const availability = await this.aiGatewayService.isAvailable();
		reconcileNodeToolGatewayCredentials(
			tools,
			this.nodeTypes,
			availability.available ? availability.config : undefined,
			ownedCredentialTypes,
		);
	}
}
