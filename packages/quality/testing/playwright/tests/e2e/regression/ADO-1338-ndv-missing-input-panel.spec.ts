import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	workflow: {
		'Test_ado_1338.json': 'Test Workflow ADO-1338',
	},
};

test.describe(
	'ADO-1338-ndv-missing-input-panel',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should show the input and output panels when node is missing input and output data', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await pong.canvas.openNode('Discourse1');
			await expect(pong.ndv.inputPanel.get()).toBeVisible();
			await expect(pong.ndv.outputPanel.get()).toBeVisible();
		});
	},
);
