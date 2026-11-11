import { chatHubTestConfig, expect, test } from './fixtures';
import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';

test.use(chatHubTestConfig);

test.describe(
	'Settings',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('set global credentials for a provider', async ({ pong, anthropicCredential }) => {
			await pong.navigate.toChatHubSettings();

			// Open Anthropic settings
			await pong.chatHubSettings.getProviderActionToggle('Anthropic').click();
			await pong.chatHubSettings.getVisiblePopoverMenuItem('Edit provider').click();

			// Configure default credential
			await pong.chatHubSettings.providerModal.getCredentialPicker().click();
			await pong.chatHubSettings.providerModal
				.getVisiblePopoverOption(anthropicCredential.name)
				.click();

			// Open credential modal and make it globally shared
			await pong.chatHubSettings.providerModal.getEditCredentialButton().click();
			await pong.chatHubSettings.credentialModal.changeTab('Sharing');
			await pong.chatHubSettings.credentialModal.getUsersSelect().click();
			await pong.chatHubSettings.credentialModal
				.getVisiblePopoverOption('All users and projects')
				.click();
			await pong.chatHubSettings.credentialModal.save();
			await pong.chatHubSettings.credentialModal.close();

			// Save settings
			await pong.chatHubSettings.providerModal.getConfirmButton().click();
			await expect(pong.notifications.getSuccessNotifications()).toHaveCount(1);

			const memberPong = await pong.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);

			await memberPong.navigate.toChatHub();
			await memberPong.chatHubChat.dismissWelcomeScreen();

			await expect(memberPong.chatHubChat.getSelectedCredentialName()).toHaveText(
				anthropicCredential.name,
			);

			await memberPong.chatHubChat.getChatInput().fill('Hello');
			await memberPong.chatHubChat.getSendButton().click();

			await expect(memberPong.chatHubChat.getChatMessages().nth(0)).toContainText('Hello'); // user-typed, assert exact
			await memberPong.chatHubChat.expectReplyAt(1); // assistant reply streamed in (content is non-deterministic)
			await memberPong.page.close();
		});

		test('restrict available LLM providers and models', async ({
			pong,
			anthropicCredential,
			anthropicApiKey,
		}) => {
			await pong.navigate.toChatHubSettings();

			// Open Anthropic settings
			await pong.chatHubSettings.getProviderActionToggle('Anthropic').click();
			await pong.chatHubSettings.getVisiblePopoverMenuItem('Edit provider').click();

			// Anthropic: configure default credential
			await pong.chatHubSettings.providerModal.getCredentialPicker().click();
			const credentialOption = pong.chatHubSettings.providerModal.getVisiblePopoverOption(
				anthropicCredential.name,
			);
			await credentialOption.click();
			await pong.page.keyboard.press('Escape');
			await expect(credentialOption).toBeHidden();

			// Anthropic: enable limit models toggle
			await pong.chatHubSettings.providerModal.getLimitModelsToggle().click();

			// Anthropic: select only Claude Opus 4.5
			await pong.chatHubSettings.providerModal.getModelSelector().click();
			await pong.chatHubSettings.providerModal.getVisiblePopoverOption('Claude Opus 4.5').click();

			// Anthropic: save settings
			await pong.chatHubSettings.providerModal.getConfirmButton().click();
			await expect(pong.chatHubSettings.providerModal.getRoot()).toBeHidden();

			// Open OpenAI settings
			await pong.chatHubSettings.getProviderActionToggle('OpenAI').click();
			await pong.chatHubSettings.getVisiblePopoverMenuItem('Edit provider').click();

			// OpenAI: disable provider and save
			await expect(pong.chatHubSettings.providerModal.getEnabledToggle()).toBeChecked();
			await pong.chatHubSettings.providerModal.getEnabledToggle().click();
			await pong.chatHubSettings.providerModal.getConfirmButton().click();
			await expect(pong.chatHubSettings.providerModal.getRoot()).toBeHidden();

			await pong.page.close();

			// Log in as member and verify only selected model is available
			const memberPong = await pong.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);

			const cred = await memberPong.api.credentials.createCredential({
				name: 'Member API key',
				type: 'anthropicApi',
				data: {
					apiKey: anthropicApiKey,
				},
			});

			await memberPong.navigate.toChatHub();
			await memberPong.chatHubChat.dismissWelcomeScreen();

			await memberPong.chatHubChat.getModelSelectorButton().click();
			await expect(memberPong.chatHubChat.getVisiblePopoverMenuItem('Anthropic')).toBeVisible();
			await expect(memberPong.chatHubChat.getVisiblePopoverMenuItem('OpenAI')).toBeHidden();
			await memberPong.chatHubChat.getVisiblePopoverMenuItem('Anthropic').hover({ force: true });

			const anthropicModels = memberPong.chatHubChat.getVisiblePopoverMenuItem(/^Claude/);
			await expect(anthropicModels).toHaveText(['Claude Opus 4.5']);

			await memberPong.api.credentials.deleteCredential(cred.id);
		});
	},
);
