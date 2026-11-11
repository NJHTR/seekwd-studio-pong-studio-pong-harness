import {
	AGENT_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	AI_MEMORY_REDIS_CHAT_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
	AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
	AI_TOOL_CODE_NODE_NAME,
	AI_TOOL_WIKIPEDIA_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	TOOL_SUBCATEGORY,
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

async function executeChatAndWaitForResponse(pong: pongPage, message: string) {
	await pong.canvas.logsPanel.sendManualChatMessage(message);
	// No execution-success toast is shown for a chat run started on an unsaved
	// workflow, so the bot reply is the completion signal. The first message also
	// has to register the chat webhook and save the workflow, hence the wide window.
	await expect(pong.canvas.getManualChatLatestBotMessage()).toBeVisible({ timeout: 15000 });
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

async function verifyLogsPanelEntries(pong: pongPage, expectedEntries: string[]) {
	await expect(pong.canvas.logsPanel.getLogEntries().first()).toBeVisible();
	await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(expectedEntries.length);
	for (let i = 0; i < expectedEntries.length; i++) {
		await expect(pong.canvas.logsPanel.getLogEntries().nth(i)).toHaveText(expectedEntries[i]);
	}
}

async function setupBasicAgentWorkflow(pong: pongPage, additionalNodes: string[] = []) {
	await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

	// Add additional nodes if specified
	for (const nodeName of additionalNodes) {
		await pong.canvas.addSupplementalNodeToParent(nodeName, 'ai_tool', AGENT_NODE_NAME, {
			closeNDV: true,
		});
	}

	// Always add OpenAI Language Model
	await addOpenAILanguageModelWithCredentials(pong, AGENT_NODE_NAME);
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

		test.describe('Workflow Execution Behavior', () => {
			test('should not open chat modal', async ({ pong }) => {
				await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

				await pong.canvas.addSupplementalNodeToParent(
					AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
					'ai_languageModel',
					AGENT_NODE_NAME,
					{ exactMatch: true, closeNDV: true },
				);

				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.getManualChatModal()).toBeHidden();
			});

			test('should remove test workflow button', async ({ pong }) => {
				await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

				await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

				await pong.canvas.addSupplementalNodeToParent(
					AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
					'ai_languageModel',
					AGENT_NODE_NAME,
					{ exactMatch: true, closeNDV: true },
				);

				await pong.canvas.disableNodeFromContextMenu(SCHEDULE_TRIGGER_NODE_NAME);
				await expect(pong.canvas.getExecuteWorkflowButton()).toBeHidden();
			});
		});

		test.describe('Node Connection and Configuration', () => {
			test('should add nodes to all Agent node input types', async ({ pong }) => {
				const agentSubNodes = [
					AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
					AI_MEMORY_REDIS_CHAT_NODE_NAME,
					AI_TOOL_CALCULATOR_NODE_NAME,
					AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
				];
				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: false });

				await pong.ndv.checkParameterCheckboxInputByName('hasOutputParser');
				await pong.ndv.clickBackToCanvasButton();
				await pong.canvas.addSupplementalNodeToParent(
					AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
					'ai_languageModel',
					AGENT_NODE_NAME,
					{ exactMatch: true, closeNDV: true },
				);

				await pong.canvas.addSupplementalNodeToParent(
					AI_MEMORY_REDIS_CHAT_NODE_NAME,
					'ai_memory',
					AGENT_NODE_NAME,
					{ closeNDV: true },
				);

				await pong.canvas.addSupplementalNodeToParent(
					AI_TOOL_CALCULATOR_NODE_NAME,
					'ai_tool',
					AGENT_NODE_NAME,
					{ closeNDV: true, subcategory: TOOL_SUBCATEGORY },
				);

				await pong.canvas.addSupplementalNodeToParent(
					AI_OUTPUT_PARSER_AUTO_FIXING_NODE_NAME,
					'ai_outputParser',
					AGENT_NODE_NAME,
					{ closeNDV: true },
				);
				for (const nodeName of agentSubNodes) {
					await expect(pong.canvas.connectionBetweenNodes(nodeName, AGENT_NODE_NAME)).toBeAttached();
				}
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(2 + agentSubNodes.length); // Chat Trigger + Agent + 4 inputs
			});

			test('should add multiple tool nodes to Agent node tool input type', async ({ pong }) => {
				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

				const tools = [
					{ name: AI_TOOL_CALCULATOR_NODE_NAME, subcategory: TOOL_SUBCATEGORY },
					{ name: AI_TOOL_CODE_NODE_NAME },
					{ name: AI_TOOL_CODE_NODE_NAME },
					{ name: AI_TOOL_WIKIPEDIA_NODE_NAME, subcategory: TOOL_SUBCATEGORY },
				];

				for (const tool of tools) {
					await pong.canvas.addSupplementalNodeToParent(tool.name, 'ai_tool', AGENT_NODE_NAME, {
						closeNDV: true,
						subcategory: tool.subcategory,
					});
					await expect(
						pong.canvas.connectionBetweenNodes(tool.name, AGENT_NODE_NAME),
					).toBeAttached();
				}

				// Chat Trigger + Agent + Tools
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(2 + tools.length);
			});
		});

		test.describe('Chat Execution and Interaction', () => {
			test('should be able to open and execute Agent node', async ({ pong }) => {
				await setupBasicAgentWorkflow(pong);

				const inputMessage = 'Hello!';
				await pong.canvas.clickManualChatButton();
				await executeChatAndWaitForResponse(pong, inputMessage);

				// Verify chat message appears
				await expect(pong.canvas.getManualChatLatestBotMessage()).toBeVisible();
			});
			test('should add and use Manual Chat Trigger node together with Agent node', async ({
				pong,
			}) => {
				await setupBasicAgentWorkflow(pong);

				const inputMessage = 'Hello!';
				await pong.canvas.clickManualChatButton();
				await executeChatAndWaitForResponse(pong, inputMessage);

				await verifyChatMessages(pong, 2, inputMessage);
				await verifyLogsPanelEntries(pong, [
					'When chat message received',
					'AI Agent',
					'OpenAI Chat Model',
				]);

				await pong.canvas.closeManualChatModal();
				await expect(pong.canvas.logsPanel.getLogEntries()).toBeHidden();
				await expect(pong.canvas.getManualChatInput()).toBeHidden();
			});
		});

		test('should keep the same session when switching tabs', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_chat_partial_execution.json');
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.logsPanel.open();

			// Send a message
			await pong.canvas.logsPanel.sendManualChatMessage('Test');
			await expect(pong.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field');

			await pong.canvas.clickExecutionsTab();

			await pong.canvas.clickEditorTab();
			await expect(pong.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field');

			// Refresh session
			await pong.canvas.logsPanel.refreshSession();
			await expect(pong.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();
		});
	},
);
