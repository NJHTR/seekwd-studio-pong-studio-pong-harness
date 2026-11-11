import {
	AGENT_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	AI_MEMORY_POSTGRES_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';
import type { pongPage } from '../../../pages/pongPage';

// Helper functions for common operations
async function addOpenAILanguageModelWithCredentials(
	pong: pongPage,
	parentNode: string,
	options: { exactMatch?: boolean; closeNDV?: boolean } = { exactMatch: true, closeNDV: false },
) {
	await pong.canvas.addSupplementalNodeToParent(
		AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
		'ai_languageModel',
		parentNode,
		options,
	);

	await pong.credentialsComposer.createFromNdv({
		apiKey: 'abcd',
	});
	await pong.ndv.clickBackToCanvasButton();
}

async function waitForWorkflowSuccess(pong: pongPage, timeout = 3000) {
	await pong.notifications.waitForNotificationAndClose('Workflow executed successfully', {
		timeout,
	});
}

async function executeChatAndWaitForResponse(pong: pongPage, message: string) {
	await pong.canvas.logsPanel.sendManualChatMessage(message);
	await waitForWorkflowSuccess(pong);
}

async function verifyChatMessages(pong: pongPage, expectedCount: number, inputMessage?: string) {
	const messages = pong.canvas.getManualChatMessages();
	await expect(messages).toHaveCount(expectedCount);
	if (inputMessage) {
		await expect(messages.first()).toContainText(inputMessage);
	}
	await expect(messages.last()).toBeVisible();
	return messages;
}

test.use({ capability: 'proxy' });
test.describe(
	'Langchain Integration',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test.beforeEach(async ({ pong, services }) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('langchain');
			await pong.canvas.openNewWorkflow();
		});

		// Create a ticket for this for AI team to fix
		test.describe('Error Handling and Logs Display', () => {
			test.fixme();

			// Helper function to set up the agent workflow with Postgres error configuration
			async function setupAgentWorkflowWithPostgresError(pong: pongPage) {
				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

				// Add Calculator Tool (required for OpenAI model)
				await pong.canvas.addSupplementalNodeToParent(
					AI_TOOL_CALCULATOR_NODE_NAME,
					'ai_tool',
					AGENT_NODE_NAME,
					{ closeNDV: true },
				);

				// Add and configure Postgres Memory
				await pong.canvas.addSupplementalNodeToParent(
					AI_MEMORY_POSTGRES_NODE_NAME,
					'ai_memory',
					AGENT_NODE_NAME,
					{ closeNDV: false },
				);

				await pong.credentialsComposer.createFromNdv({
					password: 'testtesttest',
				});

				await pong.ndv.selectOptionInParameterDropdown('sessionIdType', 'Define below');
				await pong.ndv.fillParameterInputByName('sessionKey', 'asdasd');
				await pong.ndv.clickBackToCanvasButton();

				// Add and configure OpenAI Language Model
				await addOpenAILanguageModelWithCredentials(pong, AGENT_NODE_NAME);

				await pong.canvas.clickZoomToFitButton();
			}

			// Helper function to assert logs tab is active
			async function assertLogsTabIsActive(pong: pongPage) {
				await expect(pong.ndv.getOutputDataContainer()).toBeVisible();
				await expect(pong.ndv.getAiOutputModeToggle()).toBeVisible();

				const radioButtons = pong.ndv.getAiOutputModeRadios();
				await expect(radioButtons).toHaveCount(2);
				await expect(radioButtons.nth(1)).toHaveAttribute('aria-checked', 'true');
			}

			// Helper function to assert error message is visible
			async function assertErrorMessageVisible(pong: pongPage) {
				await expect(pong.ndv.outputPanel.getErrorMessage()).toBeVisible();
				await expect(pong.ndv.outputPanel.getErrorMessage()).toContainText('Error in sub-node');
			}

			test('should open logs tab by default when there was an error', async ({ pong }) => {
				await setupAgentWorkflowWithPostgresError(pong);

				const inputMessage = 'Test the code tool';

				// Execute workflow with chat trigger
				await pong.canvas.clickManualChatButton();
				await executeChatAndWaitForResponse(pong, inputMessage);

				// Check that messages and logs are displayed
				const messages = await verifyChatMessages(pong, 2, inputMessage);
				await expect(messages.last()).toContainText(
					'[ERROR: The service refused the connection - perhaps it is offline]',
				);

				await expect(pong.canvas.logsPanel.getLogEntries().first()).toBeVisible();
				await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(3);
				await expect(pong.canvas.logsPanel.getSelectedLogEntry()).toHaveText('AI Agent');
				await expect(pong.canvas.logsPanel.outputPanel.get()).toContainText(
					AI_MEMORY_POSTGRES_NODE_NAME,
				);

				await pong.canvas.closeManualChatModal();

				// Open the AI Agent node to see the logs
				await pong.canvas.openNode(AGENT_NODE_NAME);

				// Assert that logs tab is active and error is displayed
				await assertLogsTabIsActive(pong);
				await assertErrorMessageVisible(pong);
			});

			test('should switch to logs tab on error, when NDV is already opened', async ({ pong }) => {
				// Remove the auto-added chat trigger
				await pong.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: false });

				// Set manual trigger to output standard pinned data
				await pong.ndv.getEditPinnedDataButton().click();
				await pong.ndv.savePinnedData();
				await pong.ndv.close();

				// Set up the same workflow components but with manual trigger
				await setupAgentWorkflowWithPostgresError(pong);

				// Open the AI Agent node
				await pong.canvas.openNode(AGENT_NODE_NAME);
				await pong.ndv.selectOptionInParameterDropdown('promptType', 'Define below');
				await pong.ndv.getParameterTextarea('text').fill('Some text');
				await pong.ndv.execute();
				await waitForWorkflowSuccess(pong);

				// Assert that logs tab is active and error is displayed
				await assertLogsTabIsActive(pong);
				await assertErrorMessageVisible(pong);
			});
		});
	},
);
