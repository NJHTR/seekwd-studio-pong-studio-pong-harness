import { LicenseState } from '@pong/backend-common';
import { mockInstance, getPersonalProject, testDb } from '@pong/backend-test-utils';
import {
	GLOBAL_OWNER_ROLE,
	WorkflowRepository,
	SharedWorkflowRepository,
	WorkflowEntity,
} from '@pong/db';
import { Container } from '@pong/di';
import { InstanceSettings } from 'pong-core';
import type { INode } from 'pong-workflow';
import nock from 'nock';
import { v4 as uuid } from 'uuid';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';
import { DynamicCredentialResolverService } from '@/modules/dynamic-credentials.ee/services/credential-resolver.service';
import { PongResolverSeeder } from '@/modules/dynamic-credentials.ee/services/pong-resolver-seeder.service';
import { Telemetry } from '@/telemetry';

import { createCredentials } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';
import * as utils from '../shared/utils';

mockInstance(Telemetry);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

process.env.PONG_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

mockInstance(DynamicCredentialsConfig, {
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
	endpointAuthToken: '',
});

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['dynamic-credentials'],
});

const setupWorkflow = async () => {
	const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	const resolverService = Container.get(DynamicCredentialResolverService);

	const resolver = await resolverService.create({
		name: 'Test Resolver',
		type: 'credential-resolver.oauth2-1.0',
		config: {
			metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			validation: 'oauth2-introspection',
		},
		user: owner,
	});

	const personalProject = await getPersonalProject(owner);

	const savedCredential = await createCredentials(
		{
			name: 'Test Dynamic Credential',
			type: 'oauth2',
			data: '',
			isResolvable: true,
			resolverId: resolver.id,
		},
		personalProject,
	);

	const node: INode = {
		id: uuid(),
		name: 'Test Node',
		type: 'pong-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: {
			oAuth2Api: {
				id: savedCredential.id,
				name: savedCredential.name,
			},
		},
	};

	const workflow = new WorkflowEntity();
	workflow.name = 'Test Workflow';
	workflow.nodes = [node];
	workflow.active = true;
	workflow.versionId = uuid();
	workflow.connections = {};

	const workflowRepository = Container.get(WorkflowRepository);
	const savedWorkflow = await workflowRepository.save(workflow);

	await Container.get(SharedWorkflowRepository).save({
		workflow: savedWorkflow,
		user: owner,
		project: personalProject,
		role: 'workflow:owner',
	});

	return { savedWorkflow, savedCredential };
};

describe('Workflow Status API', () => {
	let savedWorkflow: WorkflowEntity;
	let isLeaderSpy: MockInstance;

	beforeAll(async () => {
		// Force leader role so PongResolverSeeder.seed() runs (not no-op for followers).
		isLeaderSpy = vi
			.spyOn(Container.get(InstanceSettings), 'isLeader', 'get')
			.mockReturnValue(true);

		// Mock OAuth metadata endpoint for resolver validation
		nock.cleanAll();
		nock('https://auth.example.com')
			.persist()
			.get('/.well-known/openid-configuration')
			.reply(200, {
				issuer: 'https://auth.example.com',
				introspection_endpoint: 'https://auth.example.com/oauth/introspect',
				introspection_endpoint_auth_methods_supported: [
					'client_secret_basic',
					'client_secret_post',
				],
			});

		// Mock OAuth introspection endpoint for identity validation
		nock('https://auth.example.com')
			.persist()
			.post('/oauth/introspect')
			.reply(200, {
				active: true,
				sub: 'user-123',
				exp: Math.floor(Date.now() / 1000) + 3600,
			});

		await testDb.truncate([
			'User',
			'SharedWorkflow',
			'WorkflowEntity',
			'CredentialsEntity',
			'DynamicCredentialResolver',
		]);

		// Re-seed the system credential resolver, which the dynamic-credentials proxy
		// references for any workflow without an explicit `credentialResolverId`.
		await Container.get(PongResolverSeeder).seed();

		({ savedWorkflow } = await setupWorkflow());
	});

	afterAll(async () => {
		nock.cleanAll();
		isLeaderSpy.mockRestore();
		await testDb.terminate();
		testServer.httpServer.close();
	});

	describe('GET /workflows/:workflowId/execution-status', () => {
		describe('when no static auth token is provided', () => {
			it('should return a 500 Internal Server Error', async () => {
				const response = await testServer.authlessAgent
					.get(`/workflows/${savedWorkflow.id}/execution-status`)
					.set('Authorization', 'Bearer test-token')
					.expect(500);

				expect(response.body).toMatchObject({
					message: 'Dynamic credentials configuration is invalid. Check server logs for details.',
				});
			});
		});
	});
});
