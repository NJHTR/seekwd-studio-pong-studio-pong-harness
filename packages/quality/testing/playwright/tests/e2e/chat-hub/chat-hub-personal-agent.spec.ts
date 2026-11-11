import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'Personal agent',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('create personal agent and start conversation @auth:owner', async ({
			pong,
			anthropicCredential: _,
		}) => {
			await pong.navigate.toChatHub();
			await pong.chatHubChat.dismissWelcomeScreen();

			await pong.chatHubChat.getModelSelectorButton().click();
			await pong.page.waitForTimeout(500); // to reliably hover intended menu item
			await pong.chatHubChat.getVisiblePopoverMenuItem('Personal agents').hover({ force: true });
			await pong.chatHubChat.getVisiblePopoverMenuItem('New Agent', { exact: true }).click();

			await pong.chatHubChat.personalAgentModal.getNameField().fill('e2e agent');
			await pong.chatHubChat.personalAgentModal.getDescriptionField().fill('just for testing');
			await pong.chatHubChat.personalAgentModal.getSystemPromptField().fill('reply in Chinese');

			await pong.chatHubChat.personalAgentModal.getModelSelectorButton().click();
			await pong.page.waitForTimeout(500); // to reliably hover intended menu item
			await pong.chatHubChat.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });
			await pong.chatHubChat.getVisiblePopoverMenuItem('Claude Opus 4.5', { exact: true }).click();

			await pong.chatHubChat.personalAgentModal.getSaveButton().click();
			await expect(pong.chatHubChat.personalAgentModal.getRoot()).not.toBeInViewport(); // wait for modal to close

			await expect(pong.chatHubChat.getModelSelectorButton()).toContainText('e2e agent');

			await pong.chatHubChat.getChatInput().fill('Hello');
			await pong.chatHubChat.getSendButton().click();

			await expect(pong.chatHubChat.getChatMessages().last()).toContainText('你好');
		});

		test('manage personal agents @auth:admin', async ({ pong, anthropicCredential: _ }) => {
			await pong.navigate.toChatHubPersonalAgents();
			await pong.chatHubPersonalAgents.getNewAgentButton().click();

			// STEP: create an agent
			await pong.chatHubPersonalAgents.editModal.getNameField().fill('e2e agent');
			await pong.chatHubPersonalAgents.editModal.getDescriptionField().fill('just for testing');
			await pong.chatHubPersonalAgents.editModal.getSystemPromptField().fill('reply in Chinese');

			await pong.chatHubPersonalAgents.editModal.getModelSelectorButton().click();
			await pong.page.waitForTimeout(500); // to reliably hover intended menu item
			await pong.chatHubPersonalAgents.editModal
				.getVisiblePopoverMenuItem('Anthropic')
				.hover({ force: true });
			await pong.chatHubPersonalAgents.editModal
				.getVisiblePopoverMenuItem('Claude Opus 4.5', { exact: true })
				.click();

			await pong.chatHubPersonalAgents.editModal.getSaveButton().click();
			await expect(pong.chatHubPersonalAgents.editModal.getRoot()).not.toBeInViewport(); // wait for modal to close
			await expect(pong.chatHubPersonalAgents.getAgentCards()).toHaveCount(1);
			await expect(pong.chatHubPersonalAgents.getAgentCards().nth(0)).toContainText('e2e agent');

			// STEP: send message to the created agent
			await pong.chatHubPersonalAgents.getAgentCards().nth(0).click();
			await pong.chatHubChat.dismissWelcomeScreen();
			await pong.chatHubChat.getChatInput().fill('Hello');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().last()).toContainText('你好');

			// STEP: update instructions for the agent
			await pong.chatHubChat.sidebar.getPersonalAgentButton().click();
			await pong.chatHubPersonalAgents.getEditButtonAt(0).click();
			await pong.chatHubPersonalAgents.editModal.getSystemPromptField().fill('reply in Japanese');
			await pong.chatHubPersonalAgents.editModal.getSaveButton().click();
			await expect(pong.chatHubPersonalAgents.editModal.getRoot()).not.toBeInViewport(); // wait for modal to close

			// STEP: send message to the updated agent
			await pong.chatHubPersonalAgents.getAgentCards().nth(0).click();
			await pong.chatHubChat.getChatInput().fill('Hello');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().last()).toContainText('こんにちは');

			// STEP: delete the agent
			await pong.chatHubChat.sidebar.getPersonalAgentButton().click();
			await pong.chatHubPersonalAgents.getMenuAt(0).click();
			await pong.chatHubPersonalAgents.getVisiblePopoverMenuItem('Delete').click();
			await pong.chatHubPersonalAgents.confirmDeleteAgent();
			await expect(pong.chatHubPersonalAgents.getAgentCards()).toHaveCount(0);
		});
	},
);
