import { CODE_NODE_DISPLAY_NAME, CODE_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'ADO-5808 Node error reappears on replacing with different node',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should not show the deleted node execution data on a new node reusing its name', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow('ADO-5808-erroring-code-node.json');

			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.getNodeIssuesByName(CODE_NODE_DISPLAY_NAME)).toBeVisible();

			await pong.canvas.deleteNodeByName(CODE_NODE_DISPLAY_NAME);

			// The freed name is handed back to the replacement node, which must not
			// inherit the deleted node's run data.
			await pong.canvas.addNode(CODE_NODE_NAME, { action: CODE_NODE_DISPLAY_NAME });
			await pong.ndv.close();

			await expect(pong.canvas.getNodeIssuesByName(CODE_NODE_DISPLAY_NAME)).toBeHidden();

			await pong.canvas.openNode(CODE_NODE_DISPLAY_NAME);
			await expect(pong.ndv.getNodeRunErrorMessage()).toBeHidden();
		});
	},
);
