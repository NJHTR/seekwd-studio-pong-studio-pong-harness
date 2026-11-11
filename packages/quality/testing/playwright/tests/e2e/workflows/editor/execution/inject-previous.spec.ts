import { EDIT_FIELDS_SET_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const NOTIFICATIONS = {
	WORKFLOW_EXECUTED_SUCCESSFULLY: 'Workflow executed successfully',
};

test.describe(
	'Inject previous execution',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('can map keys from previous execution @engine:v2', async ({ pong }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow('NDV-debug-generate-data.json');

			await expect(pong.canvas.getExecuteWorkflowButton()).toBeVisible();

			await pong.canvas.clickZoomToFitButton();
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);

			await pong.page.reload();

			await pong.canvas.clickNodePlusEndpoint('DebugHelper');
			await expect(pong.canvas.nodeCreatorSearchBar()).toBeVisible();
			await pong.canvas.fillNodeCreatorSearchBar(EDIT_FIELDS_SET_NODE_NAME);
			await pong.canvas.clickNodeCreatorItemName(EDIT_FIELDS_SET_NODE_NAME);
			await pong.page.keyboard.press('Escape');

			await pong.canvas.openNode('Edit Fields');

			await expect(pong.ndv.getInputPanel()).toContainText(
				'The fields below come from the last successful execution.',
			);

			await expect(pong.ndv.inputPanel.getSchemaItemText('id')).toBeVisible();
			await expect(pong.ndv.inputPanel.getSchemaItemText('firstName')).toBeVisible();

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test('can pin data from previous execution @engine:v2', async ({ pong }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow('NDV-debug-generate-data.json');

			await expect(pong.canvas.getExecuteWorkflowButton()).toBeVisible();

			await pong.canvas.clickZoomToFitButton();
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);

			await pong.page.reload();
			await pong.canvas.openNode('DebugHelper');

			await pong.ndv.getEditPinnedDataButton().click();
			const editor = pong.ndv.outputPanel.getContentEditableEditor();
			await expect(editor).toContainText('"password":');
			await expect(editor).toContainText('"uid":');

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});
	},
);
