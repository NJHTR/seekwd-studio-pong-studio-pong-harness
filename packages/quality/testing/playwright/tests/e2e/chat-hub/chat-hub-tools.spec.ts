import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'Tools usage',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('use web search tool in conversation', async ({
			pong,
			anthropicCredential: _,
			jinaCredential,
		}) => {
			await pong.navigate.toChatHub();
			await pong.chatHubChat.dismissWelcomeScreen();
			await expect(pong.chatHubChat.getModelSelectorButton()).toContainText(/claude/i);

			// Open tools manager modal
			await pong.chatHubChat.getToolsButton().click();
			await expect(pong.chatHubChat.toolsModal.getRoot()).toBeVisible();

			// Add Jina AI tool from available tools list
			await pong.chatHubChat.toolsModal.getAddButton('Jina AI').click();

			// Select credential in settings view
			await pong.chatHubChat.toolsModal.getCredentialSelect().click();
			await pong.chatHubChat.getVisiblePopoverOption(jinaCredential.name).click();

			// Change Operation from "Read" to "Search"
			await pong.chatHubChat.toolsModal.getParameterInput('operation').click();
			await pong.chatHubChat.getVisiblePopoverOption('Search').click();

			// Set search query and simplify to "defined automatically by the model"
			await pong.chatHubChat.toolsModal.getFromAiOverrideButton('searchQuery').click();
			await pong.chatHubChat.toolsModal.getFromAiOverrideButton('simplify').click();

			// Save and close
			await pong.chatHubChat.toolsModal.getSaveButton().click();
			await pong.chatHubChat.toolsModal.getCloseButton().click();
			await expect(pong.chatHubChat.toolsModal.getRoot()).toBeHidden();

			// Verify tool is shown
			await expect(pong.chatHubChat.getToolsButton()).toContainText('Search web in Jina AI');

			// Send message and check response
			await pong.chatHubChat.getChatInput().fill('What is pong?');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().nth(0)).toContainText('What is pong?');
			await expect(pong.chatHubChat.getChatMessages().nth(1)).toContainText(/automation/i, {
				timeout: 60000,
			});
		});
	},
);
