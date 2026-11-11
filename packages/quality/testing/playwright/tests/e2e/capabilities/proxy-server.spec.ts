import assert from 'node:assert';

import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'proxy' });
test.describe(
	'Proxy server',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ services }) => {
			await services.proxy.clearAllExpectations();
		});

		test('should verify ProxyServer container is running', async ({ services }) => {
			const mockResponse = await services.proxy.createGetExpectation('/health', {
				status: 'healthy',
			});

			assert(typeof mockResponse !== 'string');
			expect(mockResponse.statusCode).toBe(201);

			expect(await services.proxy.wasRequestMade({ method: 'GET', path: '/health' })).toBe(false);

			// Verify the mock endpoint works
			const healthResponse = await fetch(`${services.proxy.url}/health`);
			expect(healthResponse.ok).toBe(true);
			const healthData = await healthResponse.json();
			expect(healthData.status).toBe('healthy');

			expect(await services.proxy.wasRequestMade({ method: 'GET', path: '/health' })).toBe(true);
		});

		test('should run a simple workflow calling http endpoint', async ({ pong, services }) => {
			const mockResponse = { data: 'Hello from ProxyServer!', test: '1' };

			// Create expectation in mockserver to handle the request
			await services.proxy.createGetExpectation('/data', mockResponse, { test: '1' });

			await pong.canvas.openNewWorkflow();

			// This is calling a random endpoint http://mock-api.com
			await pong.canvas.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

			// Execute workflow - this should now proxy through mockserver
			await pong.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
			await pong.canvas.openNode('HTTP Request');
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('Hello from ProxyServer!');

			// Verify the request was handled by mockserver
			expect(
				await services.proxy.wasRequestMade({
					method: 'GET',
					path: '/data',
					queryStringParameters: { test: ['1'] },
				}),
			).toBe(true);
		});

		test('should use stored expectations respond to api request', async ({ services }) => {
			await services.proxy.loadExpectations('proxy-server');

			const response = await fetch(`${services.proxy.url}/mock-endpoint`);
			expect(response.ok).toBe(true);
			const data = await response.json();
			expect(data.title).toBe('delectus aut autem');
			expect(await services.proxy.wasRequestMade({ method: 'GET', path: '/mock-endpoint' })).toBe(
				true,
			);
		});

		test('should run a simple workflow proxying HTTPS request', async ({ pong }) => {
			await pong.canvas.openNewWorkflow();
			await pong.canvas.importWorkflow('Simple_workflow_with_http_node.json', 'Test');

			await pong.canvas.openNode('HTTP Request');
			await pong.ndv.setParameterInput('url', 'https://jsonplaceholder.typicode.com/todos/1');
			await pong.ndv.execute();
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');
		});
	},
);
