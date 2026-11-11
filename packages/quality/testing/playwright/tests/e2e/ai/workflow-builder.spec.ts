import { workflowBuilderEnabledRequirements } from '../../../config/ai-builder-fixtures';
import { test, expect } from '../../../fixtures/base';
import type { pongPage } from '../../../pages/pongPage';

// Helper to open workflow builder and click a specific suggestion pill
async function openBuilderAndClickSuggestion(pong: pongPage, suggestionText: string) {
	await pong.canvas.waitForBlankCanvasReady();
	await pong.aiBuilder.waitForCanvasBuildEntry();
	await pong.aiBuilder.getCanvasBuildWithAIButton().click();
	await expect(pong.aiAssistant.getAskAssistantChat()).toBeVisible();
	await expect(pong.aiBuilder.getWorkflowSuggestions()).toBeVisible();

	// Wait for suggestions to load
	await pong.aiBuilder.getSuggestionPills().first().waitFor({ state: 'visible' });

	// Find and click the specific suggestion pill by text
	const targetPill = pong.aiBuilder.getSuggestionPills().filter({ hasText: suggestionText });
	await expect(targetPill).toBeVisible();
	await targetPill.click();

	// Suggestion pill already populated the input, just submit with Enter
	await pong.aiAssistant.sendMessage('', 'enter-key');
}

// Enable proxy server for recording/replaying Anthropic API calls
test.use({
	capability: {
		services: ['proxy'],
		env: {
			PONG_AI_ANTHROPIC_KEY: 'sk-ant-test-key-for-mocked-tests',
		},
	},
});

test.describe(
	'Workflow Builder @auth:owner @ai',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements, services }) => {
			await setupRequirements(workflowBuilderEnabledRequirements);
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('workflow-builder');
		});

		// @AI team - investigated issues with this test, the replay of recorded events not working as expected
		// doesn't appear to be matching in the correct order/some requests make it past the proxy leading to 401 error
		test.fixme('should build workflow from suggested prompt', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await openBuilderAndClickSuggestion(pong, 'YouTube video chapters');

			await expect(pong.aiAssistant.getChatMessagesUser().first()).toBeVisible();

			// Wait for workflow to be built
			await pong.aiBuilder.waitForWorkflowBuildComplete();

			await expect(pong.canvas.getCanvasNodes().first()).toBeVisible();

			const nodeCount = await pong.canvas.getCanvasNodes().count();
			expect(nodeCount).toBeGreaterThan(0);

			// Verify "Execute and refine" button appears after workflow is built
			await expect(pong.aiBuilder.getExecuteAndRefineButton()).toBeVisible();
		});

		// suffers from the same issue as test above
		test.fixme('should display assistant messages during workflow generation', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await openBuilderAndClickSuggestion(pong, 'YouTube video chapters');

			await expect(pong.aiAssistant.getChatMessagesUser().first()).toBeVisible();
			await pong.aiAssistant.waitForStreamingComplete();

			const assistantMessages = pong.aiAssistant.getChatMessagesAssistant();
			await expect(assistantMessages.first()).toBeVisible();

			const messageCount = await assistantMessages.count();
			expect(messageCount).toBeGreaterThan(0);
		});

		test('should stop workflow generation and show task aborted message', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await openBuilderAndClickSuggestion(pong, 'Daily weather report');

			await expect(pong.aiAssistant.getChatMessagesUser().first()).toBeVisible();

			// Wait for stop button to be enabled (streaming has started)
			const stopButton = pong.aiAssistant.getSendMessageButton();
			await expect(stopButton).toBeEnabled({ timeout: 30000 });

			await stopButton.click();

			// Verify "Task aborted" message appears (search by text, not test-id)
			await expect(pong.aiBuilder.getTaskAbortedMessage()).toBeVisible();

			// Verify canvas returns to default state (no nodes added)
			const nodeCount = await pong.canvas.getCanvasNodes().count();
			expect(nodeCount).toBe(0);

			// Verify the Build with AI button is still visible (canvas is back to default)
			await expect(pong.aiBuilder.getCanvasBuildWithAIButton()).toBeVisible();
		});
	},
);
