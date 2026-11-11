import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	workflow: {
		'Test_9999_SUG_38.json': 'SUG_38_Test_Workflow',
	},
};

test.describe(
	'SUG-38 Inline expression previews are not displayed in NDV',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test("should show resolved inline expression preview in NDV if the node's input data is populated", async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);

			await pong.canvas.clickZoomToFitButton();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await pong.canvas.openNode('Repro1');

			await expect(pong.ndv.getParameterExpressionPreviewValue()).toBeVisible();

			await expect(pong.ndv.getParameterExpressionPreviewValue()).toHaveText('hello there');
		});
	},
);
