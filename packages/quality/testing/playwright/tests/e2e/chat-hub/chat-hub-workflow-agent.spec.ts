import { expect, test, chatHubTestConfig } from './fixtures';
import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';
import { pongPage } from '../../../pages/pongPage';

test.use(chatHubTestConfig);

test.describe(
	'Workflow agent',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('manage workflow agents @auth:admin', async ({ pong, agentWorkflow }) => {
			// STEP: Navigate to workflow agents page and verify agent is listed
			await pong.navigate.toChatHubWorkflowAgents();
			await expect(pong.chatHubWorkflowAgents.getAgentCards()).toHaveCount(1);
			await expect(pong.chatHubWorkflowAgents.getAgentCards().nth(0)).toContainText(
				agentWorkflow.name,
			);

			// STEP: Click agent card to start conversation
			await pong.chatHubWorkflowAgents.getAgentCards().nth(0).click();
			await pong.chatHubChat.dismissWelcomeScreen();
			await expect(pong.chatHubChat.getModelSelectorButton()).toContainText(agentWorkflow.name);

			await pong.chatHubChat.getChatInput().fill('Hello');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().last()).toContainText(/Bonjour/i);

			// STEP: Open workflow in new tab and update system prompt
			const tab1Page = await pong.chatHubChat.clickOpenWorkflowButton();
			const tab1 = new pongPage(tab1Page);

			await tab1.canvas.openNode('AI Agent');
			await tab1.ndv.fillParameterInput('System Message', 'Reply in Finnish');
			await tab1.ndv.close();
			await tab1.canvas.publishWorkflow();
			await tab1Page.close();

			// STEP: Select the workflow agent for new conversation
			await pong.navigate.toChatHub();
			await pong.chatHubChat.getModelSelectorButton().click();
			await pong.page.waitForTimeout(500);
			await pong.chatHubChat.getVisiblePopoverMenuItem('Workflow agents').hover({ force: true });
			await pong.chatHubChat.getVisiblePopoverMenuItem(agentWorkflow.name, { exact: true }).click();

			// STEP: Send message again
			await pong.chatHubChat.getChatInput().fill('Hello');
			await pong.chatHubChat.getSendButton().click();
			await expect(pong.chatHubChat.getChatMessages().last()).toContainText(/Hei|Moi/i);

			// STEP: Open workflow in new tab and disable ChatHub
			const tab2Page = await pong.chatHubChat.clickOpenWorkflowButton();
			const tab2 = new pongPage(tab2Page);

			await tab2.canvas.openNode('When chat message received');
			await tab2.ndv.getParameterSwitch('availableInChat').click();
			await tab2.ndv.close();
			await tab2.canvas.publishWorkflow();
			await tab2Page.close();
			await pong.navigate.toChatHubWorkflowAgents();
			await expect(pong.chatHubWorkflowAgents.getEmptyText()).toBeVisible();
		});

		test('sharing workflow agent with project chat user', async ({
			pong,
			anthropicCredential,
			agentWorkflow,
			project,
		}) => {
			const memberPong = await pong.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);
			const memberEmail = INSTANCE_MEMBER_CREDENTIALS[0].email;

			// Transfer workflow and credential to it
			await pong.api.credentials.transferCredential(anthropicCredential.id, project.id);
			await pong.api.workflows.transfer(agentWorkflow.id, project.id);

			// Verify that the agent is visible to owner
			await pong.navigate.toChatHubWorkflowAgents();
			await expect(pong.chatHubWorkflowAgents.getAgentCards()).toContainText([agentWorkflow.name]);

			// Verify that the agent is not visible to member before sharing
			await memberPong.navigate.toChatHubWorkflowAgents();
			await expect(memberPong.chatHubWorkflowAgents.getEmptyText()).toBeVisible();

			// Add member user to the project with project chat user role
			await pong.navigate.toProjectSettings(project.id);
			await pong.projectSettings.getMembersSearchInput().click();
			await pong.projectSettings.getVisiblePopoverOption(memberEmail).click();
			await expect(pong.projectSettings.getMembersTable()).toContainText(memberEmail);
			await pong.projectSettings.getRoleDropdownFor(memberEmail).click();
			await pong.projectSettings.getVisiblePopoverOption('Project Chat User').click();
			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();

			// Verify that the agent is visible and usable to member after sharing
			await memberPong.page.reload();
			await expect(memberPong.chatHubWorkflowAgents.getAgentCards()).toContainText([
				agentWorkflow.name,
			]);
			await memberPong.chatHubWorkflowAgents.getAgentCards().nth(0).click();

			await memberPong.chatHubChat.dismissWelcomeScreen();
			await memberPong.chatHubChat.getChatInput().fill('Hello');
			await memberPong.chatHubChat.getSendButton().click();
			await expect(memberPong.chatHubChat.getChatMessages().last()).toContainText(/Bonjour/i);
		});
	},
);
