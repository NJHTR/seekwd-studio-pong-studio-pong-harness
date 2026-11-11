import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Manual partial execution',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should not execute parent nodes with no run data @engine:v2', async ({ pong }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow('manual-partial-execution.json');
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.openNode('Edit Fields');

			await pong.ndv.clickExecuteStep();

			await pong.ndv.close();

			await pong.canvas.openNode('Webhook1');

			await expect(pong.ndv.getNodeRunSuccessIndicator()).toBeHidden();
			await expect(pong.ndv.getNodeRunTooltipIndicator()).toBeHidden();
			await expect(pong.ndv.outputPanel.getRunSelector()).toBeHidden();

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test('should report a user error, not crash, when the only upstream node is disabled @engine:v2', async ({
			pong,
		}, testInfo) => {
			const { containerConfig } = testInfo.project.use as {
				containerConfig?: { workers?: number };
			};
			// In queue mode the partial run is handled by a worker, so the UserError never
			// reaches the main-process UI as a toast. Only assert it in direct (main-only) mode.
			test.skip(
				Boolean(containerConfig?.workers),
				'Toast is only shown when the run executes on a main',
			);

			// Pinned Webhook -> Process. A full run gives both nodes run data (from the pinned
			// webhook); disabling the Webhook then leaves Process with no enabled upstream node
			// to start from.
			const { workflowId } = await pong.start.fromImportedWorkflow(
				'partial-execution-disabled-pinned-parent.json',
			);
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.getNodeSuccessStatusIndicator('Process')).toBeVisible();

			await pong.canvas.disableNodeFromContextMenu('Webhook');

			await pong.canvas.openNode('Process');
			await pong.ndv.clickExecuteStep();

			await expect(
				pong.notifications
					.getNotificationByContent(/Connect a trigger and make sure it's enabled/)
					.first(),
			).toBeVisible();

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test.describe('partial execution v2', () => {
			test('should execute from the first dirty node up to the current node @engine:v2', async ({
				pong,
			}) => {
				const nodeNames = ['A', 'B', 'C'];

				await pong.navigate.toWorkflow('new');
				await pong.partialExecutionComposer.enablePartialExecutionV2();
				const { workflowId } = await pong.start.fromImportedWorkflow(
					'Test_workflow_partial_execution_v2.json',
				);
				await pong.canvas.clickZoomToFitButton();

				await pong.partialExecutionComposer.executeFullWorkflowAndVerifySuccess(nodeNames);

				const beforeText = await pong.partialExecutionComposer.captureNodeOutputData('A');

				await pong.partialExecutionComposer.modifyNodeToTriggerStaleState('B');

				await pong.partialExecutionComposer.verifyNodeStatesAfterChange(['A', 'C'], ['B']);

				await pong.partialExecutionComposer.performPartialExecutionAndVerifySuccess('C', nodeNames);

				await pong.partialExecutionComposer.openNodeForDataVerification('A');

				await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText(beforeText);

				await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
			});
		});
	},
);
