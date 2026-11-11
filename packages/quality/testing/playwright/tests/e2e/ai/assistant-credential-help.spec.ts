import {
	aiEnabledRequirements,
	aiEnabledWithSimpleChatRequirements,
} from '../../../config/ai-assistant-fixtures';
import {
	GMAIL_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'AI Assistant::enabled',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe('Credential Help', () => {
			test('should start credential help from node credential', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(aiEnabledWithSimpleChatRequirements);
				await pong.start.fromBlankCanvas();

				await pong.canvas.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
				await pong.ndv.clickBackToCanvasButton();
				await pong.canvas.addNode(GMAIL_NODE_NAME, { action: 'Get many messages', closeNDV: false });

				await pong.ndv.clickCreateNewCredential();

				await expect(pong.canvas.credentialModal.getModal()).toBeVisible();

				const assistantButton = pong.aiAssistant.getCredentialEditAssistantButton();
				await expect(assistantButton).toBeVisible();
				await assistantButton.click();

				await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);
				await expect(pong.aiAssistant.getChatMessagesUser().first()).toContainText(
					'How do I set up the credentials for Gmail OAuth2 API?',
				);
				await expect(pong.aiAssistant.getChatMessagesAssistant().first()).toContainText(
					'Hey, this is an assistant message',
				);
				await expect(assistantButton).toBeDisabled();
			});

			test('should start credential help from credential list', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(aiEnabledWithSimpleChatRequirements);

				await pong.navigate.toCredentials();

				await pong.workflows.addResource.credential();
				await pong.credentials.selectCredentialType('Notion API');

				const assistantButton = pong.aiAssistant.getCredentialEditAssistantButton();
				await expect(assistantButton).toBeVisible();
				await assistantButton.click();

				await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);
				await expect(pong.aiAssistant.getChatMessagesUser().first()).toContainText(
					'How do I set up the credentials for Notion API?',
				);
				await expect(pong.aiAssistant.getChatMessagesAssistant().first()).toContainText(
					'Hey, this is an assistant message',
				);
				await expect(assistantButton).toBeDisabled();
			});

			test('should not show assistant button if click to connect', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(aiEnabledRequirements);

				await pong.page.route('**/types/credentials.json', async (route) => {
					const response = await route.fetch();
					const credentials = (await response.json()) as Array<
						{ name?: string } & Record<string, unknown>
					>;
					const index = credentials.findIndex((c) => c.name === 'slackOAuth2Api');
					if (index >= 0) {
						credentials[index] = {
							...credentials[index],
							__overwrittenProperties: ['clientId', 'clientSecret'],
						};
					}
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(credentials),
					});
				});

				await pong.start.fromBlankCanvas();
				await pong.canvas.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.addNode('Slack', { action: 'Get a channel' });

				await pong.ndv.clickCreateNewCredential();

				// The modal defaults to the node's requested auth type — for Slack that
				// is "Access Token" (its default `authentication`), not managed OAuth2.
				await expect(pong.canvas.credentialModal.getModeDropdownTrigger()).toHaveText(
					/Access Token/,
				);

				// Managed OAuth (click to connect) has no fields to fill — no assistant button
				await pong.canvas.credentialModal.selectAuthTypeFromDropdown('Managed OAuth2 (recommended)');
				await expect(pong.canvas.credentialModal.oauthConnectButton).toHaveCount(1);
				await expect(pong.canvas.credentialModal.getCredentialInputs()).toHaveCount(3);
				await expect(pong.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(0);

				// Switch to custom OAuth via dropdown — assistant button should appear
				await pong.canvas.credentialModal.selectAuthTypeFromDropdown('Custom OAuth2');
				await expect(pong.canvas.credentialModal.getCredentialInputs()).toHaveCount(6);
				await expect(pong.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(1);
			});

			test('should not show assistant button when click to connect with some fields', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(aiEnabledRequirements);

				await pong.page.route('**/types/credentials.json', async (route) => {
					const response = await route.fetch();
					const credentials = (await response.json()) as Array<
						{ name?: string } & Record<string, unknown>
					>;
					const index = credentials.findIndex((c) => c.name === 'microsoftOutlookOAuth2Api');
					if (index >= 0) {
						credentials[index] = {
							...credentials[index],
							__overwrittenProperties: [
								'authUrl',
								'accessTokenUrl',
								'clientId',
								'authentication',
								'clientCredentialType',
								'clientSecret',
								'privateKey',
								'certificate',
								'graphApiBaseUrl',
							],
						};
					}
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(credentials),
					});
				});

				await pong.start.fromBlankCanvas();
				await pong.canvas.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.addNode('Microsoft Outlook', { action: 'Get a calendar' });

				await pong.ndv.clickCreateNewCredential();

				await expect(pong.canvas.credentialModal.oauthConnectButton).toHaveCount(1);
				await expect(pong.canvas.credentialModal.getCredentialInputs()).toHaveCount(2);
				await expect(pong.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(0);
			});
		});
	},
);
