import {
	AGENT_NODE_NAME,
	AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
	BASIC_LLM_CHAIN_NODE_NAME,
	CHAT_TRIGGER_NODE_DISPLAY_NAME,
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

async function executeChatAndWaitForResponse(pong: pongPage, message: string) {
	await pong.canvas.logsPanel.sendManualChatMessage(message);
	// No execution-success toast is shown for a chat run started on an unsaved
	// workflow, so the bot reply is the completion signal. The first message also
	// has to register the chat webhook and save the workflow, hence the wide window.
	await expect(pong.canvas.getManualChatLatestBotMessage()).toBeVisible({ timeout: 15000 });
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

		test.describe('Auto-add Behavior', () => {
			test('should auto-add chat trigger and basic LLM chain when adding LLM node', async ({
				pong,
			}) => {
				await pong.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, { closeNDV: true });

				await expect(
					pong.canvas.connectionBetweenNodes(
						CHAT_TRIGGER_NODE_DISPLAY_NAME,
						BASIC_LLM_CHAIN_NODE_NAME,
					),
				).toBeAttached();

				await expect(
					pong.canvas.connectionBetweenNodes(
						AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME,
						BASIC_LLM_CHAIN_NODE_NAME,
					),
				).toBeAttached();

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			});

			test('should not auto-add nodes if AI nodes are already present', async ({ pong }) => {
				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

				await pong.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, { closeNDV: true });

				await expect(
					pong.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, AGENT_NODE_NAME),
				).toBeAttached();

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			});

			test('should not auto-add nodes if ChatTrigger is already present', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, {
					closeNDV: true,
					trigger: 'On new Chat event',
				});

				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });

				await pong.canvas.addNode(AI_LANGUAGE_MODEL_OPENAI_CHAT_MODEL_NODE_NAME, { closeNDV: true });

				await expect(
					pong.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, AGENT_NODE_NAME),
				).toBeAttached();

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			});
		});

		test.describe('Chat Execution and Interaction', () => {
			test('should be able to open and execute Basic LLM Chain node', async ({ pong }) => {
				await pong.canvas.addNode(BASIC_LLM_CHAIN_NODE_NAME, { closeNDV: true });

				await addOpenAILanguageModelWithCredentials(pong, BASIC_LLM_CHAIN_NODE_NAME);

				await pong.canvas.openNode(BASIC_LLM_CHAIN_NODE_NAME);
				const inputMessage = 'Hello!';

				await pong.ndv.execute();
				await executeChatAndWaitForResponse(pong, inputMessage);

				// Verify chat message appears
				await expect(pong.canvas.getManualChatLatestBotMessage()).toBeVisible();
			});
		});
	},
);
