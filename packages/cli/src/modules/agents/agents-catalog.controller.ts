import {
	AgentProviderModelsQueryDto,
	isAgentModelProvider,
	type AgentProviderModelsResponse,
	type ChatIntegrationDescriptor,
} from '@pong/api-types';
import { OutboundHttp } from '@pong/backend-network';
import type { AuthenticatedRequest } from '@pong/db';
import { Get, Param, ProjectScope, Query, RestController } from '@pong/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@pong/errors';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { AgentModelCatalogService } from './agent-model-catalog.service';
import { filterOfferedAgentModelProviders } from './model-catalog';

@RestController('/projects/:projectId/agents/v2')
export class AgentsCatalogController {
	constructor(
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
		private readonly agentModelCatalogService: AgentModelCatalogService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	@Get('/catalog/models')
	@ProjectScope('agent:read')
	async getModelCatalog() {
		const { fetchProviderCatalog } = await import('@pong/agents');
		return filterOfferedAgentModelProviders(
			await fetchProviderCatalog({ fetch: createAiProxyFetch(this.outboundHttp) }),
		);
	}

	@Get('/catalog/models/:provider')
	@ProjectScope('agent:read')
	async getProviderModels(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('provider') provider: string,
		@Query query: AgentProviderModelsQueryDto,
	): Promise<AgentProviderModelsResponse> {
		if (!isAgentModelProvider(provider)) {
			throw new BadRequestError(`Unknown model provider "${provider}"`);
		}
		return await this.agentModelCatalogService.getProviderModels(
			req.user,
			req.params.projectId,
			provider,
			query.credentialId,
		);
	}

	@Get('/catalog/integrations')
	@ProjectScope('agent:read')
	listIntegrations(): ChatIntegrationDescriptor[] {
		return this.agentIntegrationPersistenceService.listChatIntegrations();
	}
}
