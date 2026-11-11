import { EDIT_FIELDS_SET_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'CAT-726 Node connectors not rendered when nodes inserted on the canvas',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should correctly append a No Op node when Loop Over Items node is added (from add button)', async ({
			pong,
		}) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await pong.canvas.addNodeBetweenNodes(
				'When clicking ‘Execute workflow’',
				'Edit Fields',
				'Loop Over Items (Split in Batches)',
			);

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
			await expect(pong.canvas.nodeConnections()).toHaveCount(4);

			await expect
				.soft(pong.canvas.connectionBetweenNodes('Loop Over Items', 'Replace Me'))
				.toBeVisible();
			await expect
				.soft(pong.canvas.connectionBetweenNodes('Loop Over Items', 'Edit Fields'))
				.toBeVisible();
			await expect
				.soft(pong.canvas.connectionBetweenNodes('Replace Me', 'Loop Over Items'))
				.toBeVisible();
		});
	},
);
