import { IF_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

const FILTER_PARAM_NAME = 'conditions';

test.describe(
	'If Node (filter component)',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should be able to create and delete multiple conditions', async ({ pong }) => {
			await pong.canvas.addNode(IF_NODE_NAME, { closeNDV: false });

			// Default state
			await expect(pong.ndv.getFilterComponent(FILTER_PARAM_NAME)).toBeVisible();
			await expect(pong.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(1);
			await expect(pong.ndv.getFilterConditionOperator(FILTER_PARAM_NAME)).toHaveText('is equal to');

			// Add
			await pong.ndv.addFilterCondition(FILTER_PARAM_NAME);
			await pong.ndv.getFilterConditionLeftInput(FILTER_PARAM_NAME, 0).fill('first left');
			await pong.ndv.getFilterConditionLeftInput(FILTER_PARAM_NAME, 1).fill('second left');
			await pong.ndv.addFilterCondition(FILTER_PARAM_NAME);
			await expect(pong.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(3);

			// Delete
			await pong.ndv.removeFilterCondition(FILTER_PARAM_NAME, 0);
			await expect(pong.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(2);
			await expect(pong.ndv.getFilterConditionLeftInput(FILTER_PARAM_NAME, 0)).toHaveValue(
				'second left',
			);
			await pong.ndv.removeFilterCondition(FILTER_PARAM_NAME, 1);
			await expect(pong.ndv.getFilterConditions(FILTER_PARAM_NAME)).toHaveCount(1);
		});

		test('should correctly evaluate conditions', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_filter.json');

			await pong.canvas.clickExecuteWorkflowButton();

			await pong.canvas.openNode('Then');
			await expect(pong.ndv.outputPanel.get()).toContainText('3 items');
			await pong.ndv.close();

			await pong.canvas.openNode('Else');
			await expect(pong.ndv.outputPanel.get()).toContainText('1 item');
		});
	},
);
