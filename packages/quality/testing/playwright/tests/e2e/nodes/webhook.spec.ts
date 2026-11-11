import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { EditFieldsNode } from '../../../pages/components/nodes/EditFieldsNode';
import type { pongPage } from '../../../pages/pongPage';

const cowBase64 =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

test.describe(
	'Webhook Trigger node',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should listen for all HTTP methods (GET, POST, DELETE, HEAD, PATCH, PUT)', async ({
			pong,
		}) => {
			await pong.canvas.addNode('Webhook');
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();

			const methods = ['GET', 'POST', 'DELETE', 'HEAD', 'PATCH', 'PUT'] as const;
			for (const method of methods) {
				await pong.ndv.setupHelper.webhook({ httpMethod: method });
				await pong.ndv.execute();
				await expect(pong.ndv.getWebhookTestEvent()).toBeVisible();

				const response = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`, { method });
				expect(response.ok(), `${method} request should succeed`).toBe(true);

				// Wait for output to appear (confirms execution completed)
				await expect(pong.ndv.outputPanel.getDataContainer()).toBeVisible();
			}
		});

		test('should listen for a GET request and respond with Respond to Webhook node', async ({
			pong,
		}) => {
			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				responseMode: "Using 'Respond to Webhook' Node",
			});
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();
			await pong.ndv.close();
			await addEditFieldsNode(pong);
			await pong.canvas.addNode('Respond to Webhook', { closeNDV: true });

			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.waitingForTriggerEvent()).toBeVisible();
			const response = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
			expect(response.ok()).toBe(true);

			const responseData = await response.json();
			expect(responseData.MyValue).toBe(1234);
		});

		test('should listen for a GET request and respond with custom status code 201', async ({
			pong,
		}) => {
			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({ httpMethod: 'GET' });
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();

			// Add the Response Code optional parameter
			await pong.ndv.addParameterOptionByName('Response Code');
			// Select 201 from the dropdown
			await pong.ndv.selectOptionInParameterDropdown('responseCode', '201');
			await pong.ndv.execute();
			await expect(pong.ndv.getWebhookTestEvent()).toBeVisible();

			const response = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
			expect(response.status()).toBe(201);
		});

		test('should listen for a GET request and respond with last node', async ({ pong }) => {
			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				responseMode: 'When Last Node Finishes',
			});
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();
			await pong.ndv.close();

			await addEditFieldsNode(pong);

			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.waitingForTriggerEvent()).toBeVisible();

			const response = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
			expect(response.ok()).toBe(true);

			const responseData = await response.json();
			expect(responseData.MyValue).toBe(1234);
		});

		test('should listen for a GET request and respond with last node binary data', async ({
			pong,
		}) => {
			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				responseMode: 'When Last Node Finishes',
			});
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();
			await pong.ndv.selectOptionInParameterDropdown('responseData', 'First Entry Binary');
			await pong.ndv.close();

			await pong.canvas.addNode('Edit Fields (Set)');
			const editFieldsNode = new EditFieldsNode(pong.page);
			await editFieldsNode.setSingleFieldValue('data', 'string', cowBase64);
			await pong.ndv.close();

			await pong.canvas.addNode('Convert to File', { action: 'Convert to JSON' });
			await pong.ndv.selectOptionInParameterDropdown('mode', 'Each Item to Separate File');
			await pong.ndv.close();

			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.waitingForTriggerEvent()).toBeVisible();

			const response = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
			expect(response.ok()).toBe(true);

			const responseData = await response.json();
			expect('data' in responseData).toBe(true);
		});

		test('should listen for a GET request and respond with an empty body', async ({ pong }) => {
			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				responseMode: 'When Last Node Finishes',
			});
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();
			await pong.ndv.selectOptionInParameterDropdown('responseData', 'No Response Body');
			await pong.ndv.execute();
			await expect(pong.ndv.getWebhookTestEvent()).toBeVisible();

			const response = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`);
			expect(response.ok()).toBe(true);

			const responseData = await response.text();
			expect(responseData).toBe('');
		});

		test('should listen for a GET request with Basic Authentication', async ({ pong }) => {
			const credentialName = `test-${nanoid()}`;
			const user = `test-${nanoid()}`;
			const password = `test-${nanoid()}`;
			await pong.credentialsComposer.createFromApi({
				type: 'httpBasicAuth',
				name: credentialName,
				data: {
					user,
					password,
				},
			});

			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				authentication: 'Basic Auth',
			});
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();

			await pong.ndv.credentials.selectByName(credentialName);

			await pong.ndv.execute();
			await expect(pong.ndv.getWebhookTestEvent()).toBeVisible();

			const failResponse = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
				headers: {
					Authorization: 'Basic ' + Buffer.from('wrong:wrong').toString('base64'),
				},
			});
			expect(failResponse.status()).toBe(401);

			const successResponse = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
				headers: {
					Authorization: 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'),
				},
			});
			expect(successResponse.ok()).toBe(true);
		});

		test('should listen for a GET request with Header Authentication', async ({ pong }) => {
			const credentialName = `test-${nanoid()}`;
			// Keep the header NAME underscore-free: proxies commonly drop request headers
			// with underscores in the name (the multi-main CI stack's Caddy LB does), and
			// nanoid's default alphabet includes '_'. Values are unaffected.
			const name = `test-${nanoid().replaceAll('_', '-')}`;
			const value = `test-${nanoid()}`;
			await pong.credentialsComposer.createFromApi({
				type: 'httpHeaderAuth',
				name: credentialName,
				data: {
					name,
					value,
				},
			});

			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({
				httpMethod: 'GET',
				authentication: 'Header Auth',
			});
			const webhookPath = await pong.ndv.setupHelper.getWebhookPath();

			await pong.ndv.credentials.selectByName(credentialName);

			await pong.ndv.execute();
			await expect(pong.ndv.getWebhookTestEvent()).toBeVisible();

			// The test webhook can take a moment to register after "Listening for test
			// event" appears. A wrong-credential request is safe to retry because it fails
			// auth before the workflow runs, so it never consumes the one-shot test webhook.
			// Polling until it returns 403 also confirms the webhook is registered before
			// the (single-use) success request is fired, avoiding a registration race.
			await expect(async () => {
				const failResponse = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
					headers: {
						test: 'wrong',
					},
					maxNotFoundRetries: 0,
				});
				expect(failResponse.status()).toBe(403);
			}).toPass();

			const successResponse = await pong.api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
				headers: {
					[name]: value,
				},
			});
			expect(successResponse.ok()).toBe(true);
		});

		test('CAT-1253-bug-cant-run-workflow-when-unconnected-nodes-have-errors', async ({ pong }) => {
			// Add Webhook node
			await pong.canvas.addNode('Webhook');
			await pong.ndv.setupHelper.webhook({
				httpMethod: 'GET',
			});
			await pong.ndv.close();

			// Add No Operation node - it will connect automatically since Webhook node is in context
			await pong.canvas.nodeByName('Webhook').click();
			await pong.canvas.addNode('No Operation, do nothing', { closeNDV: true });

			// Verify connection was created
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			// Add HTTP Request node (unconnected, which will have an error)
			await pong.canvas.deselectAll();
			await pong.canvas.addNode('HTTP Request', { closeNDV: true });

			// Verify we now have 3 nodes but still only 1 connection
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			// Execute the workflow
			await pong.canvas.clickExecuteWorkflowButton();

			// Assert that webhook is waiting for trigger
			await expect(pong.canvas.waitingForTriggerEvent()).toBeVisible();

			// Assert that no error toast appeared
			await expect(pong.notifications.getErrorNotifications()).toHaveCount(0);
		});

		test.describe('test webhook called on a main without the editor session @mode:multi-main', () => {
			test('should respond with Respond to Webhook node body', async ({
				pong,
				mainUrls,
				createApiForMain,
			}) => {
				test.skip(mainUrls.length < 2, 'Requires at least 2 mains');

				await pong.canvas.addNode('Webhook');
				await pong.ndv.setupHelper.webhook({
					httpMethod: 'GET',
					responseMode: "Using 'Respond to Webhook' Node",
				});
				const webhookPath = await pong.ndv.setupHelper.getWebhookPath();
				await pong.ndv.close();
				await addEditFieldsNode(pong);
				await pong.canvas.addNode('Respond to Webhook', { closeNDV: true });

				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.waitingForTriggerEvent()).toBeVisible();

				const otherMain = await createApiForMain(1);
				const response = await otherMain.webhooks.trigger(`/webhook-test/${webhookPath}`);
				expect(response.status()).toBe(200);

				const body = await response.text();
				expect(JSON.parse(body)).toEqual({ MyValue: 1234 });
			});

			test('should respond with last node output', async ({ pong, mainUrls, createApiForMain }) => {
				test.skip(mainUrls.length < 2, 'Requires at least 2 mains');

				await pong.canvas.addNode('Webhook');
				await pong.ndv.setupHelper.webhook({
					httpMethod: 'GET',
					responseMode: 'When Last Node Finishes',
				});
				const webhookPath = await pong.ndv.setupHelper.getWebhookPath();
				await pong.ndv.close();
				await addEditFieldsNode(pong);

				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.waitingForTriggerEvent()).toBeVisible();

				const otherMain = await createApiForMain(1);
				const response = await otherMain.webhooks.trigger(`/webhook-test/${webhookPath}`);
				expect(response.status()).toBe(200);

				const body = await response.text();
				expect(JSON.parse(body)).toEqual({ MyValue: 1234 });
			});
		});
	},
);

async function addEditFieldsNode(pong: pongPage): Promise<void> {
	await pong.canvas.addNode('Edit Fields (Set)');

	const editFieldsNode = new EditFieldsNode(pong.page);
	await editFieldsNode.setSingleFieldValue('MyValue', 'number', 1234);

	await pong.ndv.close();
}
