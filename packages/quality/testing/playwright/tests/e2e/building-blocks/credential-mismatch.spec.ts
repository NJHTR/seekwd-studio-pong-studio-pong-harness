import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'HTTP Request credential picker with mismatched credentials object',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should show saved credentials when nodeCredentialType matches despite mismatched credentials object', async ({
			pong,
			api,
		}) => {
			await pong.start.fromHome();

			const anthropicCredName = `Anthropic API ${nanoid()}`;
			await api.credentials.createCredential({
				name: anthropicCredName,
				type: 'anthropicApi',
				data: {
					apiKey: 'test-api-key-12345',
				},
			});

			const headerAuthCredName = `Header Auth ${nanoid()}`;
			const headerAuthCred = await api.credentials.createCredential({
				name: headerAuthCredName,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-api-key',
					value: 'test-value',
				},
			});

			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'pong-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'pong-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
						parameters: {
							method: 'POST',
							url: 'https://api.anthropic.com/v1/messages',
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'anthropicApi',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'anthropic-version',
										value: '2023-06-01',
									},
								],
							},
							sendBody: true,
							specifyBody: 'json',
							jsonBody: '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 1024}',
							options: {},
						},
						credentials: {
							httpHeaderAuth: {
								id: headerAuthCred.id,
								name: headerAuthCredName,
							},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
				active: false,
				settings: {},
			});

			await pong.navigate.toWorkflow(workflow.id);
			await pong.canvas.openNode('HTTP Request');
			await expect(pong.ndv.container).toBeVisible();

			const credSelect = pong.ndv.getCredentialSelect();
			await credSelect.click();

			const credOptions = pong.ndv.getCredentialDropdownOptions();

			const anthropicOption = credOptions.filter({ hasText: anthropicCredName });
			await expect(anthropicOption).toBeVisible();

			const headerAuthOption = credOptions.filter({ hasText: headerAuthCredName });
			await expect(headerAuthOption).not.toBeVisible();
		});

		test('should persist credential selection across reload when mismatch is resolved', async ({
			pong,
			api,
		}) => {
			await pong.start.fromHome();

			const anthropicCredName = `Anthropic API ${nanoid()}`;
			await api.credentials.createCredential({
				name: anthropicCredName,
				type: 'anthropicApi',
				data: {
					apiKey: 'test-api-key-12345',
				},
			});

			const headerAuthCredName = `Header Auth ${nanoid()}`;
			const headerAuthCred = await api.credentials.createCredential({
				name: headerAuthCredName,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-api-key',
					value: 'test-value',
				},
			});

			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'pong-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'pong-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
						parameters: {
							method: 'POST',
							url: 'https://api.anthropic.com/v1/messages',
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'anthropicApi',
						},
						credentials: {
							httpHeaderAuth: {
								id: headerAuthCred.id,
								name: headerAuthCredName,
							},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
				active: false,
				settings: {},
			});

			await pong.navigate.toWorkflow(workflow.id);
			await pong.canvas.openNode('HTTP Request');
			await expect(pong.ndv.container).toBeVisible();

			await pong.ndv.credentials.selectByName(anthropicCredName);

			const saveResponse = pong.canvas.waitForSaveWorkflowCompleted();
			await pong.ndv.close();
			await saveResponse;

			await pong.page.reload();
			await expect(pong.canvas.nodeByName('HTTP Request')).toBeVisible();

			await pong.canvas.openNode('HTTP Request');
			await expect(pong.ndv.container).toBeVisible();

			await expect(pong.ndv.getCredentialSelect()).toHaveValue(anthropicCredName);
		});
	},
);
