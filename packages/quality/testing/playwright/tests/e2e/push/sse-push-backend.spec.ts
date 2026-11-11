import { test, expect } from '../../../fixtures/base';

/**
 * The default container stack runs the `websocket` push backend, so `sse` needs a
 * container of its own. `NODE_ENV` is pinned to `production` because the origin
 * check this covers is gated on it, and the stack's base env otherwise forces
 * `development` — without the override the connection is accepted unchecked.
 */
test.use({ capability: { env: { PONG_PUSH_BACKEND: 'sse', NODE_ENV: 'production' } } });

test.beforeEach(({ pongContainer }) => {
	test.skip(!pongContainer, 'container-only: requires the SSE backend configuration');
});

test.describe(
	'SSE push backend',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should deliver execution results over an SSE push connection', async ({ pong }) => {
			// `EventSource` sends no `Origin` on a same-origin GET, so the connection has to
			// be accepted on the strength of `Sec-Fetch-Site` alone.
			const pushResponse = pong.page.waitForResponse((response) =>
				response.url().includes('/push?pushRef='),
			);

			await pong.start.fromImportedWorkflow('manual-trigger-with-code.json');
			expect((await pushResponse).status()).toBe(200);

			// Run status per node arrives over that connection, so it cannot show up unless
			// the stream stayed open. The container is freshly booted here, so this is its
			// first Code node run and pays the task runner's cold start — measured at 3-4s,
			// well past the helper's 3s default.
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
				{ timeout: 20_000 },
			);
			await expect(pong.canvas.getNodeSuccessStatusIndicator('Code')).toBeVisible();
		});
	},
);
