import {
	AGENT_NODE_NAME,
	AI_TOOL_CALCULATOR_NODE_NAME,
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

		// @AI team to look at this
		test.describe('Tool Usage Notifications', () => {
			test.fixme();

			test('should show tool info notice if no existing tools were used during execution', async ({
				pong,
			}) => {
				await setupBasicAgentWorkflow(pong, [AI_TOOL_CALCULATOR_NODE_NAME]);
				await pong.canvas.openNode(AGENT_NODE_NAME);

				const inputMessage = 'Hello!';
				await pong.ndv.execute();
				await executeChatAndWaitForResponse(pong, inputMessage);

				await pong.canvas.closeManualChatModal();
				await pong.canvas.openNode(AGENT_NODE_NAME);

				await expect(pong.ndv.getRunDataInfoCallout()).toBeVisible();
			});
			test('should not show tool info notice if tools were used during execution', async ({
				pong,
			}) => {
				await pong.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, { closeNDV: true });
				await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: false });
				await expect(pong.ndv.getRunDataInfoCallout()).toBeHidden();
				await pong.ndv.clickBackToCanvasButton();

				await addOpenAILanguageModelWithCredentials(pong, AGENT_NODE_NAME);

				await pong.canvas.addSupplementalNodeToParent(
					AI_TOOL_CALCULATOR_NODE_NAME,
					'ai_tool',
					AGENT_NODE_NAME,
					{ closeNDV: true },
				);

				const inputMessage = 'What is 1000 * 10?';
				await pong.canvas.clickManualChatButton();
				await executeChatAndWaitForResponse(pong, inputMessage);

				await pong.canvas.closeManualChatModal();
				await pong.canvas.openNode(AGENT_NODE_NAME);

				await expect(pong.ndv.getRunDataInfoCallout()).toBeHidden();
			});
		});
	},
);
