import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'Basic conversation',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('new chat with pre-configured credentials', async ({ pong, anthropicCredential: _ }) => {
			await pong.navigate.toChatHub();
			await pong.chatHubChat.dismissWelcomeScreen();

			await expect(pong.chatHubChat.getGreetingMessage()).toContainText('Start a chat with');
			await expect(pong.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // pre-selected

			await pong.chatHubChat.getChatInput().fill('Hello');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().nth(0)).toContainText('Hello'); // user-typed, assert exact
			await pong.chatHubChat.expectReplyAt(1); // assistant reply streamed in (content is non-deterministic)
			// Assert the auto-titled conversation is listed rather than matching its
			// generated title text, which drifts as fixtures are re-recorded.
			await expect(pong.chatHubChat.sidebar.getConversations().first()).toBeVisible();
		});

		// Test with a different user to avoid race condition on credentials
		test('new chat without pre-configured credentials @auth:member', async ({
			pong,
			anthropicApiKey,
		}) => {
			await pong.navigate.toChatHub();
			await pong.chatHubChat.dismissWelcomeScreen();

			await expect(pong.chatHubChat.getGreetingMessage()).toContainText(
				'Select a model to start chatting',
			);

			await pong.chatHubChat.getModelSelectorButton().click();
			await pong.page.waitForTimeout(500); // to reliably hover intended menu item
			await pong.chatHubChat.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });
			await pong.chatHubChat
				.getVisiblePopoverMenuItem('Configure credentials', { exact: true })
				.click();

			await pong.canvas.credentialModal.fillField('apiKey', anthropicApiKey);
			await pong.canvas.credentialModal.save();
			await pong.canvas.credentialModal.close();

			await expect(pong.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // auto-select a model

			await pong.chatHubChat.getChatInput().fill('Hello from e2e');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().nth(0)).toContainText('Hello from e2e'); // user-typed, assert exact
			await pong.chatHubChat.expectReplyAt(1); // assistant reply streamed in (content is non-deterministic)
			// Assert the auto-titled conversation is listed rather than matching its
			// generated title text, which drifts as fixtures are re-recorded.
			await expect(pong.chatHubChat.sidebar.getConversations().first()).toBeVisible();
		});
	},
);
