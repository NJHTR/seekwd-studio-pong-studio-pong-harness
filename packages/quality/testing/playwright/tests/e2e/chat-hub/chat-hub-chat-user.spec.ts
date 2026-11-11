import { chatHubTestConfig, expect, test } from './fixtures';
import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';

test.use(chatHubTestConfig);

test.describe(
	'Chat user role',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('use chat as chat user @auth:chat', async ({ pong, anthropicApiKey }) => {
			const ownerPong = await pong.start.withUser(INSTANCE_OWNER_CREDENTIALS);

			// Create global credential as owner
			const cred = await ownerPong.api.credentials.createCredential({
				name: 'Global Anthropic API key',
				type: 'anthropicApi',
				isGlobal: true,
				data: {
					apiKey: anthropicApiKey,
				},
			});

			await pong.goToRoot();
			await pong.page.waitForURL('/home/chat'); // root is the chat UI for chat users

			// Verify global credential is available and pre-selected
			await expect(pong.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // pre-selected
			await expect(pong.chatHubChat.getSelectedCredentialName()).toHaveText(
				'Global Anthropic API key',
			);

			await pong.chatHubChat.getModelSelectorButton().click();
			await pong.chatHubChat.getVisiblePopoverMenuItem('Anthropic').click();
			await pong.chatHubChat
				.getVisiblePopoverMenuItem('Configure credentials', { exact: true })
				.click();

			// Verify other credentials are not available and cannot be created
			await pong.chatHubChat.credModal.getCredentialSelector().click();
			await expect(pong.chatHubChat.credModal.getCreateButton()).toBeDisabled();
			await expect(pong.chatHubChat.credModal.getVisiblePopoverOption()).toHaveCount(1);
			await expect(pong.chatHubChat.credModal.getVisiblePopoverOption().nth(0)).toContainText(
				'Global Anthropic API key',
			);
			await pong.chatHubChat.credModal.getCloseButton().click();

			// Send chat message
			await pong.chatHubChat.getChatInput().fill('Hi');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().nth(0)).toHaveText('Hi'); // user-typed, assert exact
			await pong.chatHubChat.expectReplyAt(1); // assistant reply streamed in (content is non-deterministic)
			await expect(pong.chatHubChat.getChatMessages()).toHaveCount(2);

			await ownerPong.api.credentials.deleteCredential(cred.id);
		});
	},
);
