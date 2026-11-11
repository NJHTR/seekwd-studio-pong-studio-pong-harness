import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV Paired Items',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('maps paired input and output items', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await pong.canvas.clickZoomToFitButton();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await pong.canvas.openNode('Sort');

			await expect(pong.ndv.inputPanel.get()).toContainText('6 items');
			await expect(pong.ndv.outputPanel.get()).toContainText('6 items');

			await pong.ndv.inputPanel.switchDisplayMode('table');
			await pong.ndv.outputPanel.switchDisplayMode('table');

			// input to output
			const inputTableRow1 = pong.ndv.inputPanel.getTableRow(1);
			await expect(inputTableRow1).toBeVisible();
			await expect(inputTableRow1).toHaveAttribute('data-test-id', 'hovering-item');

			// Move the cursor to simulate hover behavior
			await inputTableRow1.hover();
			await expect(pong.ndv.outputPanel.getTableRow(4)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.inputPanel.getTableRow(2).hover();
			await expect(pong.ndv.outputPanel.getTableRow(2)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.inputPanel.getTableRow(3).hover();
			await expect(pong.ndv.outputPanel.getTableRow(6)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			// output to input
			await pong.ndv.outputPanel.getTableRow(1).hover();
			await expect(pong.ndv.inputPanel.getTableRow(4)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.outputPanel.getTableRow(4).hover();
			await expect(pong.ndv.inputPanel.getTableRow(1)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.outputPanel.getTableRow(2).hover();
			await expect(pong.ndv.inputPanel.getTableRow(2)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.outputPanel.getTableRow(6).hover();
			await expect(pong.ndv.inputPanel.getTableRow(3)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.outputPanel.getTableRow(1).hover();
			await expect(pong.ndv.inputPanel.getTableRow(4)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);
		});

		test('maps paired input and output items based on selected input node', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await pong.canvas.clickZoomToFitButton();
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await pong.canvas.openNode('Set2');

			await expect(pong.ndv.inputPanel.get()).toContainText('6 items');
			await expect(pong.ndv.outputPanel.getRunSelectorInput()).toHaveValue('2 of 2 (6 items)');

			await pong.ndv.inputPanel.switchDisplayMode('table');
			await pong.ndv.outputPanel.switchDisplayMode('table');

			// Default hover state should have first item from input node highlighted
			const hoveringItem = pong.ndv.inputPanel.getHoveringItems();
			await expect(hoveringItem).toContainText('1111');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('1111');

			// Select different input node and check that the hover state is updated
			await pong.ndv.selectInputNode('Set1');
			await expect(hoveringItem).toContainText('1000');

			// Hover on input item and verify output hover state
			await pong.ndv.inputPanel.getTableCellByText('1000').hover();
			await expect(pong.ndv.outputPanel.getHoveringItems()).toContainText('1000');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('1000');

			// Switch back to Sort input
			await pong.ndv.selectInputNode('Sort');
			await pong.ndv.changeOutputRunSelector('1 of 2 (6 items)');

			await expect(hoveringItem).toContainText('1111');
			await pong.ndv.inputPanel.getTableCellByText('1111').hover();
			await expect(pong.ndv.outputPanel.getHoveringItems()).toContainText('1111');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('1111');
		});

		test('maps paired input and output items based on selected run', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await pong.canvas.clickZoomToFitButton();
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await pong.canvas.openNode('Set3');

			await pong.ndv.inputPanel.switchDisplayMode('table');
			await pong.ndv.outputPanel.switchDisplayMode('table');

			// Start from linked state
			await pong.ndv.ensureOutputRunLinking(true);
			await pong.ndv.inputPanel.getTbodyCell(0, 0).click(); // remove tooltip

			await expect(pong.ndv.inputPanel.getRunSelectorInput()).toHaveValue('2 of 2 (6 items)');
			await expect(pong.ndv.outputPanel.getRunSelectorInput()).toHaveValue('2 of 2 (6 items)');

			await pong.ndv.changeOutputRunSelector('1 of 2 (6 items)');
			await expect(pong.ndv.inputPanel.getRunSelectorInput()).toHaveValue('1 of 2 (6 items)');
			await expect(pong.ndv.outputPanel.getRunSelectorInput()).toHaveValue('1 of 2 (6 items)');

			await expect(pong.ndv.inputPanel.getTableRow(1)).toContainText('1111');
			await expect(pong.ndv.inputPanel.getTableRow(1)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await expect(pong.ndv.outputPanel.getTableRow(1)).toContainText('1111');
			await pong.ndv.outputPanel.getTableRow(1).hover();

			await expect(pong.ndv.outputPanel.getTableRow(3)).toContainText('4444');
			await pong.ndv.outputPanel.getTableRow(3).hover();

			await expect(pong.ndv.inputPanel.getTableRow(3)).toContainText('4444');
			await expect(pong.ndv.inputPanel.getTableRow(3)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.changeOutputRunSelector('2 of 2 (6 items)');

			await expect(pong.ndv.inputPanel.getTableRow(1)).toContainText('1000');
			await pong.ndv.inputPanel.getTableRow(1).hover();

			await expect(pong.ndv.outputPanel.getTableRow(1)).toContainText('1000');
			await expect(pong.ndv.outputPanel.getTableRow(1)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await expect(pong.ndv.outputPanel.getTableRow(3)).toContainText('2000');
			await pong.ndv.outputPanel.getTableRow(3).hover();

			await expect(pong.ndv.inputPanel.getTableRow(3)).toContainText('2000');
			await expect(pong.ndv.inputPanel.getTableRow(3)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);
		});

		test('can pair items between input and output across branches and runs', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('multi-branch-data-transform.json');
			await pong.canvas.clickZoomToFitButton();
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await pong.canvas.openNode('IF');

			await pong.ndv.inputPanel.switchDisplayMode('table');
			await pong.ndv.outputPanel.switchDisplayMode('table');

			// Switch to False Branch
			await pong.ndv.outputPanel.getBranchTab('False Branch (2 items)').click();
			await expect(pong.ndv.outputPanel.getTableRow(1)).toContainText('8888');
			await pong.ndv.outputPanel.getTableRow(1).hover();

			await expect(pong.ndv.inputPanel.getTableRow(5)).toContainText('8888');
			await expect(pong.ndv.inputPanel.getTableRow(5)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await expect(pong.ndv.outputPanel.getTableRow(2)).toContainText('9999');
			await pong.ndv.outputPanel.getTableRow(2).hover();

			await expect(pong.ndv.inputPanel.getTableRow(6)).toContainText('9999');
			await expect(pong.ndv.inputPanel.getTableRow(6)).toHaveAttribute(
				'data-test-id',
				'hovering-item',
			);

			await pong.ndv.close();

			await pong.canvas.openNode('Set5');

			// Switch to True Branch for input
			await pong.ndv.inputPanel.getBranchTab('True Branch').click();

			await pong.ndv.changeOutputRunSelector('(2 items)');
			await expect(pong.ndv.outputPanel.getTableRow(1)).toContainText('8888');
			await pong.ndv.outputPanel.getTableRow(1).hover();

			// Should not have matching hover state when branches don't match
			const hoveringItems = pong.ndv.inputPanel.getHoveringItems();
			await expect(hoveringItems).toHaveCount(0);

			await expect(pong.ndv.inputPanel.getTableRow(1)).toContainText('1111');
			await pong.ndv.inputPanel.getTableRow(1).hover();
			const outputHoveringItems = pong.ndv.outputPanel.getHoveringItems();
			await expect(outputHoveringItems).toHaveCount(0);

			// Switch to False Branch
			await pong.ndv.inputPanel.getBranchTab('False Branch').click();
			await expect(pong.ndv.inputPanel.getTableRow(1)).toContainText('8888');
			await pong.ndv.inputPanel.getTableRow(1).hover();

			await pong.ndv.changeOutputRunSelector('(4 items)');
			await expect(pong.ndv.outputPanel.getTableRow(1)).toContainText('1111');
			await pong.ndv.outputPanel.getTableRow(1).hover();

			await pong.ndv.changeOutputRunSelector('(2 items)');
			await expect(pong.ndv.inputPanel.getTableRow(1)).toContainText('8888');
			await pong.ndv.inputPanel.getTableRow(1).hover();
			await expect(pong.ndv.outputPanel.getHoveringItems()).toContainText('8888');
		});

		test('should auto-fix pairedItem when multiple inputs create single output', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow('Test_workflow_ndv_paired_item_single_output.json');
			await pong.canvas.openNode('Use paired item');
			await pong.ndv.execute();

			await expect(pong.ndv.getNodeRunErrorMessage()).toBeHidden();
			await expect(pong.ndv.outputPanel.get()).toContainText('Jay Gatsby');
		});

		test('can resolve expression with paired item in multi-input node', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('expression_with_paired_item_in_multi_input_node.json');

			await pong.canvas.clickZoomToFitButton();

			const PINNED_DATA = [
				{
					id: 'abc',
					historyId: 'def',
					messages: [
						{
							id: 'abc',
						},
					],
				},
				{
					id: 'abc',
					historyId: 'def',
					messages: [
						{
							id: 'abc',
						},
						{
							id: 'abc',
						},
						{
							id: 'abc',
						},
					],
				},
				{
					id: 'abc',
					historyId: 'def',
					messages: [
						{
							id: 'abc',
						},
					],
				},
			];

			await pong.canvas.openNode('Get thread details1');
			await pong.ndv.setPinnedData(PINNED_DATA);
			await pong.ndv.close();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await pong.canvas.openNode('Switch1');
			await pong.ndv.execute();

			await expect(pong.ndv.getParameterExpressionPreviewOutput()).toContainText('1');

			await pong.ndv.getInlineExpressionEditorInput().click();
			await expect(pong.ndv.getInlineExpressionEditorPreview()).toContainText('1');

			// Select next item
			await pong.ndv.expressionSelectNextItem();
			await expect(pong.ndv.getInlineExpressionEditorPreview()).toContainText('3');

			// Select next item again
			await pong.ndv.expressionSelectNextItem();
			await expect(pong.ndv.getInlineExpressionEditorPreview()).toContainText('1');

			// Next button should be disabled
			await expect(pong.ndv.getInlineExpressionEditorItemNextButton()).toBeDisabled();
		});
	},
);
