import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test Pong Node', () => {
	const baseUrl = 'https://test.app.pong.cloud/api/v1';
	const credentials = {
		pongApi: {
			apiKey: 'key123',
			baseUrl,
		},
	};

	beforeAll(async () => {
		const { pinData } = await import('./workflow.pong.workflows.json');
		const apiResponse = pinData.pong.map((item) => item.json);
		nock(baseUrl).get('/workflows?tags=pong-test').reply(200, { data: apiResponse });
		nock(baseUrl)
			.post('/projects/proj-123/users', {
				relations: [{ userId: 'user-456', role: 'project:editor' }],
			})
			.reply(201);

		const { pinData: userPinData } = await import('./user.get.workflow.json');
		nock(baseUrl)
			.get('/users/123e4567-e89b-12d3-a456-426614174000')
			.query({ includeRole: 'false' })
			.reply(200, userPinData['Get by ID'][0].json);
		nock(baseUrl)
			.get('/users/jane.doe%40example.com')
			.query({ includeRole: 'true' })
			.reply(200, userPinData['Get by email'][0].json);
	});

	new NodeTestHarness().setupTests({ credentials });
});
