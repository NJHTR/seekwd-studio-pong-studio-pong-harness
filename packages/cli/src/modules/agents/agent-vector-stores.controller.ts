import { TestAgentVectorStoreDto, type VectorStoreTestResult } from '@pong/api-types';
import type { AuthenticatedRequest } from '@pong/db';
import { Body, Post, ProjectScope, RestController } from '@pong/decorators';
import type { Response } from 'express';

import { CredentialsService } from '@/credentials/credentials.service';
import { VectorStoreConnectionTestService } from '@/modules/knowledge/vector-stores/connection-test.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';

@RestController('/projects/:projectId/agents/v2')
export class AgentVectorStoresController {
	constructor(
		private readonly vectorStoreConnectionTestService: VectorStoreConnectionTestService,
		private readonly credentialsService: CredentialsService,
	) {}

	@Post('/vector-stores/test')
	@ProjectScope('agent:update')
	async testConnection(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: TestAgentVectorStoreDto,
	): Promise<VectorStoreTestResult> {
		const { projectId } = req.params;
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
		);
		return await this.vectorStoreConnectionTestService.testConnection(
			payload.vectorStore,
			credentialProvider,
		);
	}
}
