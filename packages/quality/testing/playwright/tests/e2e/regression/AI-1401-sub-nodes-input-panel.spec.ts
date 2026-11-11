import { test, expect } from '../../../fixtures/base';

test.describe(
	'AI-1401 AI sub-nodes show node output with no path back in input',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test('should show correct root node for nested sub-nodes in input panel', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_ai_1401.json');

			// Execute the workflow first to generate data
			await pong.canvas.executeNode('Edit Fields');
			await pong.notifications.waitForNotification('Node executed successfully');

			for (const node of ['hackernews_top', 'hackernews_sub']) {
				await pong.canvas.openNode(node);
				await expect(pong.ndv.container).toBeVisible();
				await expect(pong.ndv.inputPanel.get()).toBeVisible();

				// Switch to JSON mode within the mapping view
				await pong.ndv.inputPanel.switchDisplayMode('json');
				// Verify the input node dropdown shows the correct parent nodes
				const inputNodeSelect = pong.ndv.inputPanel.getNodeInputOptions();
				await expect(inputNodeSelect).toBeVisible();
				await inputNodeSelect.click();
				await expect(pong.ndv.getVisiblePopoverOption('Edit Fields')).toBeVisible();
				await expect(pong.ndv.getVisiblePopoverOption('Manual Trigger')).toBeVisible();
				await expect(pong.ndv.getVisiblePopoverOption('No Operation, do nothing')).toBeHidden();

				await pong.ndv.clickBackToCanvasButton();
			}
		});
	},
);
