import { test, expect } from '../../../fixtures/base';

test.describe(
	'ADO-2362 ADO-2350 NDV Prevent clipping long parameters and scrolling to expression',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should show last parameters and open at scroll top of parameters', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test-workflow-with-long-parameters.json');

			await pong.canvas.openNode('Schedule Trigger');

			await expect(pong.ndv.getInlineExpressionEditorInput().first()).toBeVisible();

			await pong.ndv.close();

			await pong.canvas.openNode('Edit Fields1');

			await expect(pong.ndv.getInputLabel().nth(0)).toContainText('Mode');
			await expect(pong.ndv.getInputLabel().nth(0)).toBeVisible();

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveCount(2);

			await expect(pong.ndv.getInlineExpressionEditorInput().nth(0)).toHaveText(
				'should be visible!',
			);
			await expect(pong.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

			await expect(pong.ndv.getInlineExpressionEditorInput().nth(1)).toHaveText('not visible');
			await expect(pong.ndv.getInlineExpressionEditorInput().nth(1)).toBeVisible();

			await pong.ndv.close();
			await pong.canvas.openNode('Schedule Trigger');

			await expect(pong.ndv.getNthParameter(0)).toContainText(
				'This workflow will run on the schedule ',
			);
			await expect(pong.ndv.getInputLabel().nth(0)).toBeVisible();

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveCount(2);

			await expect(pong.ndv.getInlineExpressionEditorInput().nth(0)).toHaveText('should be visible');
			await expect(pong.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

			await expect(pong.ndv.getInlineExpressionEditorInput().nth(1)).toHaveText('not visible');
			await expect(pong.ndv.getInlineExpressionEditorInput().nth(1)).not.toBeInViewport();

			await pong.ndv.close();
			await pong.canvas.openNode('Slack');

			await expect(pong.ndv.getCredentialsLabel()).toBeVisible();

			await expect(pong.ndv.getInlineExpressionEditorInput().nth(0)).toHaveText('should be visible');
			await expect(pong.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

			await expect(pong.ndv.getInlineExpressionEditorInput().nth(1)).toHaveText('not visible');
			await expect(pong.ndv.getInlineExpressionEditorInput().nth(1)).not.toBeInViewport();
		});

		test('NODE-1272 ensure expressions scrolled to top, not middle', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test-workflow-with-long-parameters.json');

			await pong.canvas.openNode('With long expression');

			await expect(pong.ndv.getInlineExpressionEditorInput().nth(0)).toBeVisible();

			await expect(pong.ndv.getInlineExpressionEditorLine(0)).toHaveText('1 visible!');
			await expect(pong.ndv.getInlineExpressionEditorLine(0)).toBeVisible();
			await expect(pong.ndv.getInlineExpressionEditorLine(6)).toHaveText('7 not visible!');
			await expect(pong.ndv.getInlineExpressionEditorLine(6)).not.toBeInViewport();
		});
	},
);
