import { aiEnabledRequirements } from '../../../config/ai-assistant-fixtures';
import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';
import type { pongPage } from '../../../pages/pongPage';

async function expectExecuteButtonRightOfControls(pong: pongPage) {
	const executeButton = pong.canvas.getExecuteWorkflowButton();
	const tidyUpButton = pong.canvas.getTidyUpButton();
	await expect(executeButton).toBeVisible();
	await expect(tidyUpButton).toBeVisible();

	// ADO-5630: Keep the run button clear of the rightmost canvas control.
	await expect
		.poll(async () => {
			const execute = await executeButton.boundingBox();
			const tidyUp = await tidyUpButton.boundingBox();
			if (!execute || !tidyUp) return null;
			return execute.x - (tidyUp.x + tidyUp.width);
		})
		.toBeGreaterThanOrEqual(0);
}

test.describe(
	'ADO-5630: Execute workflow button layout',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test.beforeEach(async ({ pong, setupRequirements }) => {
			await setupRequirements(aiEnabledRequirements);
			await pong.page.setViewportSize({ width: 1024, height: 768 });
			await pong.start.fromImportedWorkflow('Test_workflow_chat_partial_execution.json');
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		});

		test('keeps the run button clear of canvas controls with the assistant closed', async ({
			pong,
		}) => {
			await expectExecuteButtonRightOfControls(pong);
		});

		test('keeps the run button to the right of canvas controls when the assistant opens', async ({
			pong,
		}) => {
			await pong.aiAssistant.getAskAssistantCanvasActionButton().click();
			await expect(pong.aiAssistant.getAskAssistantChat()).toBeVisible();
			await expect
				.poll(async () => (await pong.canvas.canvasPane().boundingBox())?.width)
				.toBeLessThan(700);

			await expectExecuteButtonRightOfControls(pong);
		});
	},
);
