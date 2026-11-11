import { testDb, createWorkflow } from '@pong/backend-test-utils';
import { UrlService } from '@pong/backend-services';
import { GlobalConfig } from '@pong/config';
import type { IWorkflowDb } from '@pong/db';
import { Container } from '@pong/di';
import type { INodeParameters } from 'pong-workflow';
import { v4 as uuid } from 'uuid';

import { TestWebhooks } from '@/webhooks/test-webhooks';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

describe('Manual run of a Form Trigger', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;
	let testBaseUrl: string;
	const workflowIds: string[] = [];

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		await utils.initNodeTypes(loadNodesFromDist(['pong-nodes-base.formTrigger']));
		await utils.initBinaryDataService();

		workflowExecutionService = Container.get(WorkflowExecutionService);
		testBaseUrl = Container.get(UrlService).getTestWebhookBaseUrl();
	});

	afterEach(async () => {
		for (const workflowId of workflowIds.splice(0)) {
			await Container.get(TestWebhooks).cancelWebhook(workflowId);
		}
		await testDb.truncate(['WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const { formTest, webhookTest } = Container.get(GlobalConfig).endpoints;

	test.each([
		{
			typeVersion: 1,
			parameters: (path: string): INodeParameters => ({ path }),
			testUrl: (path: string) => `${testBaseUrl}${webhookTest}/${path}/pong-form`,
		},
		{
			typeVersion: 2,
			parameters: (path: string): INodeParameters => ({ path: `={{ "${path}" }}` }),
			testUrl: (path: string) => `${testBaseUrl}${formTest}/${path}`,
		},
		{
			typeVersion: 2.1,
			parameters: (path: string): INodeParameters => ({ path: `={{ "${path}" }}` }),
			testUrl: (path: string) => `${testBaseUrl}${formTest}/${path}`,
		},
		{
			typeVersion: 2.6,
			parameters: (path: string): INodeParameters => ({ options: { path } }),
			testUrl: (path: string) => `${testBaseUrl}${formTest}/${path}`,
		},
	])(
		'returns the test URL of the registered v$typeVersion Form Trigger',
		async ({ typeVersion, parameters, testUrl }) => {
			const path = `form-${uuid()}`;
			const workflow = await createWorkflow(
				{
					name: 'Form Trigger',
					nodes: [
						{
							id: uuid(),
							name: 'Form',
							type: 'pong-nodes-base.formTrigger',
							typeVersion,
							position: [0, 0],
							parameters: {
								...parameters(path),
								formTitle: 'Form',
								formFields: { values: [{ fieldLabel: 'name' }] },
							},
							webhookId: uuid(),
						},
					],
					connections: {},
				} as unknown as IWorkflowDb,
				owner,
			);
			workflowIds.push(workflow.id);

			const result = await workflowExecutionService.executeManually(
				workflow,
				{ triggerToStartFrom: { name: 'Form' } },
				owner,
			);

			expect(result).toEqual({ waitingForWebhook: true, formTestUrls: [testUrl(path)] });
		},
	);
});
