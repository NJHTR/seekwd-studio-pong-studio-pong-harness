import { workflowBuilderEnabledRequirements } from '../../../config/ai-builder-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Legacy Workflow Builder @auth:owner @ai',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('opens from an empty canvas with an enabled suggestion', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements(workflowBuilderEnabledRequirements);
			await pong.start.fromBlankCanvas();

			await pong.aiBuilder.waitForCanvasBuildEntry();
			await pong.aiBuilder.getCanvasBuildWithAIButton().click();

			await expect(pong.aiAssistant.getAskAssistantSidebar()).toBeVisible();
			await expect(pong.aiAssistant.getAskAssistantChat()).toBeVisible();

			const suggestion = pong.aiBuilder
				.getSuggestionPills()
				.filter({ hasText: 'Daily weather report' });
			await expect(suggestion).toBeVisible();
			await expect(suggestion).toBeEnabled();
		});
	},
);
