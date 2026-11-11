import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI chat basics',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'should display empty state for new conversation',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ pong }) => {
				await pong.navigate.toInstanceAi();

				await expect(pong.instanceAi.getChatInput()).toBeVisible();
				await expect(pong.instanceAi.getSendButton()).toBeVisible();
			},
		);

		test('should send message and receive assistant response', async ({ pong }) => {
			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage('Hello, what can you help me with?');

			await expect(pong.instanceAi.getUserMessages().first()).toBeVisible();
			await pong.instanceAi.waitForAssistantResponse(120_000);
			await expect(pong.instanceAi.getAssistantMessages().first()).toBeVisible();
		});

		test('should display user and assistant messages in timeline', async ({ pong }) => {
			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage('Say hello back to me');

			await expect(pong.instanceAi.getUserMessages().first()).toContainText('Say hello back to me');
			await pong.instanceAi.waitForAssistantResponse(120_000);
			await expect(pong.instanceAi.getAssistantMessages().first()).toBeVisible();
		});

		test('should persist messages after page reload', async ({ pong }) => {
			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage('Remember this persistence message');
			await pong.instanceAi.waitForResponseComplete(120_000);
			await expect(pong.page).toHaveURL(/\/assistant\/[^/]+$/);

			await pong.page.reload();
			await expect(pong.instanceAi.getChatInput()).toBeVisible({ timeout: 30_000 });

			await expect(pong.instanceAi.getUserMessages().first()).toContainText(
				'Remember this persistence message',
				{ timeout: 30_000 },
			);
			await expect(pong.instanceAi.getAssistantMessages().first()).toBeVisible({ timeout: 30_000 });
		});
	},
);
