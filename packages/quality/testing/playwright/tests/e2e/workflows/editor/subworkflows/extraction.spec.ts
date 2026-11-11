import { test, expect } from '../../../../../fixtures/base';

const EDIT_FIELDS_NAMES = [
	'Edit Fields0',
	'Edit Fields1',
	'Edit Fields2',
	'Edit Fields3',
	'Edit Fields4',
	'Edit Fields5',
];

test.describe(
	'Subworkflow Extraction',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Subworkflow-extraction-workflow.json');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(7);
			await pong.canvas.clickZoomToFitButton();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await pong.canvas.deselectAll();
		});

		test('should extract a single node, succeed execution, and undo successfully', async ({
			pong,
		}) => {
			await pong.canvas.rightClickNode(EDIT_FIELDS_NAMES[0]);

			await expect(pong.canvas.getContextMenuItem('extract_sub_workflow')).toBeVisible();
			await pong.canvas.clickContextMenuAction('extract_sub_workflow');
			await pong.canvas.convertToSubworkflowModal.waitForModal();
			await pong.canvas.convertToSubworkflowModal.clickSubmitButton();
			await pong.canvas.convertToSubworkflowModal.waitForClose();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await pong.canvas.hitUndo();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
		});

		test('should extract all nodes besides trigger, succeed execution, and undo successfully', async ({
			pong,
		}) => {
			await pong.canvas.nodeByName(EDIT_FIELDS_NAMES[0]).click();

			await pong.canvas.extendSelectionWithArrows('right');
			await pong.canvas.rightClickNode(EDIT_FIELDS_NAMES[0]);
			await pong.canvas.clickContextMenuAction('extract_sub_workflow');
			await pong.canvas.convertToSubworkflowModal.waitForModal();
			await pong.canvas.convertToSubworkflowModal.clickSubmitButton();
			await pong.canvas.convertToSubworkflowModal.waitForClose();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await pong.canvas.hitUndo();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
		});

		test.describe('disconnected branch extraction (ADO-4679)', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.start.fromImportedWorkflow('Subworkflow-extraction-disconnected.json');

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
				await pong.canvas.clickZoomToFitButton();
			});

			test('should extract a disconnected branch and connect it properly', async ({ pong }) => {
				await pong.canvas.nodeByName('Edit Fields Disconnected 1').click();
				await pong.canvas.extendSelectionWithArrows('right');

				await pong.canvas.rightClickNode('Edit Fields Disconnected 1');
				await pong.canvas.clickContextMenuAction('extract_sub_workflow');
				await pong.canvas.convertToSubworkflowModal.waitForModal();
				await pong.canvas.convertToSubworkflowModal.clickSubmitButton();
				await pong.canvas.convertToSubworkflowModal.waitForClose();

				const executeWorkflowNode = pong.canvas.getCanvasNodes().filter({
					hasText: 'Call My Sub-workflow',
				});
				await expect(executeWorkflowNode).toHaveCount(1);

				await pong.canvas.nodeByName('Call My Sub-workflow').waitFor({ state: 'visible' });
				await pong.canvas.connectNodesByDrag(
					"When clicking 'Execute workflow'",
					'Call My Sub-workflow',
				);

				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await pong.canvas.openNode('Call My Sub-workflow');
				await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('lal');
				await pong.ndv.close();
			});
		});
	},
);
