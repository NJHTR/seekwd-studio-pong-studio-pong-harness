import { test, expect } from '../../../../../fixtures/base';
import type { pongPage } from '../../../../../pages/pongPage';

const NODE_NAMES = {
	PROCESS_THE_DATA: 'Process The Data',
	START_ON_SCHEDULE: 'Start on Schedule',
	EDIT_FIELDS: 'Edit Fields',
	IF: 'If',
	NO_OP_2: 'NoOp2',
	WEBHOOK: 'Webhook',
	TEST_EXPRESSION: 'Test Expression',
};

const NOTIFICATIONS = {
	WORKFLOW_EXECUTED_SUCCESSFULLY: 'Workflow executed successfully',
	EXECUTION_STOPPED: 'Execution stopped',
	EXECUTION_DELETED: 'Execution deleted',
};

const TIMEOUTS = {
	NODE_SUCCESS_WAIT: 5000,
};

/**
 * Helper function to assert node execution states (success/running indicators)
 */
async function assertNodeExecutionStates(
	pong: pongPage,
	checks: Array<{
		nodeName: string;
		success?: 'visible' | 'hidden';
		running?: 'visible' | 'hidden';
	}>,
) {
	for (const check of checks) {
		if (check.success !== undefined) {
			const assertion = check.success === 'visible' ? 'toBeVisible' : 'toBeHidden';
			await expect(pong.canvas.getNodeSuccessStatusIndicator(check.nodeName))[assertion]();
		}
		if (check.running !== undefined) {
			const assertion = check.running === 'visible' ? 'toBeVisible' : 'toBeHidden';
			await expect(pong.canvas.getNodeRunningStatusIndicator(check.nodeName))[assertion]();
		}
	}
}

test.describe(
	'Execution',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should test manual workflow @engine:v2', async ({ pong }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow('Manual_wait_set.json');

			await expect(pong.canvas.getExecuteWorkflowButton()).toBeVisible();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.getExecuteWorkflowButtonSpinner()).toBeVisible();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionButton()).toBeVisible();
			await expect(pong.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Manual', success: 'visible' },
				{ nodeName: 'Wait', success: 'hidden', running: 'visible' },
				{ nodeName: 'Set', success: 'hidden' },
			]);

			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Manual', success: 'visible' },
				{ nodeName: 'Wait', success: 'visible' },
				{ nodeName: 'Set', success: 'visible' },
			]);

			await expect(pong.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible({
				timeout: TIMEOUTS.NODE_SUCCESS_WAIT,
			});

			await pong.notifications.waitForNotificationAndClose(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);

			await expect(pong.canvas.clearExecutionDataButton()).toBeVisible();
			await pong.canvas.clearExecutionData();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
		});

		// Failing/flaky in multi-main
		test.fixme('should test manual workflow stop', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Manual_wait_set.json');

			await expect(pong.canvas.getExecuteWorkflowButton()).toBeVisible();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.getExecuteWorkflowButtonSpinner()).toBeVisible();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionButton()).toBeVisible();
			await expect(pong.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Manual', success: 'visible' },
				{ nodeName: 'Wait', running: 'visible' },
			]);

			await pong.canvas.stopExecutionButton().click();

			await pong.notifications.waitForNotificationAndClose(NOTIFICATIONS.EXECUTION_STOPPED);

			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Manual', success: 'visible' },
				{ nodeName: 'Wait', running: 'hidden' },
				{ nodeName: 'Set', success: 'hidden' },
			]);

			await expect(pong.canvas.clearExecutionDataButton()).toBeVisible();
			await pong.canvas.clearExecutionData();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
		});

		test('should stop a manual workflow while it waits @engine:v2', async ({ pong }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow('Manual_long_wait_set.json');

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.stopExecutionButton()).toBeVisible();
			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Manual', success: 'visible' },
				{ nodeName: 'Wait', running: 'visible' },
			]);

			await pong.canvas.stopExecutionButton().click();

			// No toast: the editor only shows "Execution stopped" when the finish push
			// beats its own stop poll, so the outcome is asserted instead.
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();
			await expect(pong.canvas.getExecuteWorkflowButton()).toBeVisible();
			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Manual', success: 'visible' },
				{ nodeName: 'Wait', success: 'hidden', running: 'hidden' },
				{ nodeName: 'Set', success: 'hidden' },
			]);

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
			const [execution] = await pong.api.workflows.getExecutions(workflowId, 1);
			expect(execution.status).toBe('canceled');
		});

		test('should test webhook workflow @engine:v2', async ({ pong, api }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow('Webhook_wait_set.json');

			await expect(pong.canvas.getExecuteWorkflowButton()).toBeVisible();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionWaitingForWebhookButton()).toBeHidden();

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.getExecuteWorkflowButtonSpinner()).toBeVisible();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();
			await expect(pong.canvas.stopExecutionWaitingForWebhookButton()).toBeVisible();

			await pong.canvas.openNode('Webhook');

			await pong.clipboard.grant();
			await pong.ndv.getCopyInputButton().click();
			await pong.ndv.clickBackToCanvasButton();

			const webhookUrl = await pong.clipboard.readText();
			const response = await api.webhooks.trigger(webhookUrl);
			expect(response.status()).toBe(200);

			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Webhook', success: 'visible' },
				{ nodeName: 'Wait', success: 'hidden', running: 'visible' },
				{ nodeName: 'Set', success: 'hidden' },
			]);

			await expect(pong.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible({
				timeout: TIMEOUTS.NODE_SUCCESS_WAIT,
			});
			await assertNodeExecutionStates(pong, [
				{ nodeName: 'Webhook', success: 'visible' },
				{ nodeName: 'Wait', success: 'visible' },
				{ nodeName: 'Set', success: 'visible' },
			]);

			await pong.notifications.waitForNotificationAndClose(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);

			await expect(pong.canvas.clearExecutionDataButton()).toBeVisible();
			await pong.canvas.clearExecutionData();
			await expect(pong.canvas.clearExecutionDataButton()).toBeHidden();

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test('should execute workflow from specific trigger nodes independently @engine:v2', async ({
			pong,
		}) => {
			const { workflowId } = await pong.start.fromImportedWorkflow('Two_schedule_triggers.json');

			await pong.canvas.clickZoomToFitButton();
			await expect(pong.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
			await expect(pong.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');

			await pong.canvas.nodeByName('Trigger A').hover();
			await expect(pong.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '1');
			await expect(pong.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');
			await pong.canvas.clickExecuteWorkflowButton('Trigger A');

			await pong.notifications.waitForNotificationAndClose(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);
			await pong.canvas.openNode('Edit Fields');
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('Trigger A');

			await pong.ndv.clickBackToCanvasButton();
			await expect(pong.ndv.container).toBeHidden();

			await pong.canvas.nodeByName('Trigger B').hover();
			await expect(pong.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
			await expect(pong.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '1');
			await pong.canvas.clickExecuteWorkflowButton('Trigger B');

			await pong.notifications.waitForNotificationAndClose(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);
			await pong.canvas.openNode('Edit Fields');
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('Trigger B');

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test.describe('execution preview', () => {
			test('when deleting the last execution, it should show empty state', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.addInitialNodeToCanvas('Manual Trigger');
				await pong.canvas.clickExecuteWorkflowButton();

				await pong.notifications.waitForNotification(NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY);

				await pong.canvas.openExecutions();

				await pong.executions.deleteExecutionInPreview();

				await expect(pong.executions.getSuccessfulExecutionItems()).toHaveCount(0);
				await pong.notifications.waitForNotificationAndClose(NOTIFICATIONS.EXECUTION_DELETED);
			});
		});

		/**
		 * @TODO New Canvas: Different classes for pinned states on edges and nodes
		 */
		test.describe('connections should be colored differently for pinned data', () => {
			test.fixme();

			test('when executing the workflow', async () => {
				// Not yet migrated - waiting for New Canvas implementation
			});

			test('when executing a node', async () => {
				// Not yet migrated - waiting for New Canvas implementation
			});

			test('when connecting pinned node by output drag and drop', async () => {
				// Not yet migrated - waiting for New Canvas implementation
			});

			test('when connecting pinned node after adding an unconnected node', async () => {
				// Not yet migrated - waiting for New Canvas implementation
			});
		});

		test('should send proper payload for node rerun @engine:v2', async ({ pong }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow(
				'Multiple_trigger_node_rerun.json',
			);
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.clearExecutionDataButton()).toBeVisible();

			const payload = await pong.executionsComposer.executeNodeAndCapturePayload(
				NODE_NAMES.PROCESS_THE_DATA,
			);

			expect(payload).toHaveProperty('runData');
			expect(payload.runData).toBeInstanceOf(Object);
			expect(payload.runData).toEqual({
				[NODE_NAMES.START_ON_SCHEDULE]: expect.any(Array),
				[NODE_NAMES.EDIT_FIELDS]: expect.any(Array),
				[NODE_NAMES.PROCESS_THE_DATA]: expect.any(Array),
			});

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test('should send proper payload for manual node run @engine:v2', async ({ pong }) => {
			const { workflowId } = await pong.start.fromImportedWorkflow(
				'Check_manual_node_run_for_pinned_and_rundata.json',
			);
			await pong.canvas.clickZoomToFitButton();

			const firstPayload = await pong.executionsComposer.executeNodeAndCapturePayload(NODE_NAMES.IF);

			expect(firstPayload).not.toHaveProperty('runData');
			expect(firstPayload).toHaveProperty('workflowId');
			expect(firstPayload).not.toHaveProperty('workflowData');

			await expect(pong.canvas.clearExecutionDataButton()).toBeVisible();

			const secondPayload = await pong.executionsComposer.executeNodeAndCapturePayload(
				NODE_NAMES.NO_OP_2,
			);

			expect(secondPayload).toHaveProperty('runData');
			expect(secondPayload.runData).toBeInstanceOf(Object);
			expect(secondPayload).toHaveProperty('workflowId');
			expect(secondPayload).not.toHaveProperty('workflowData');

			expect(secondPayload.runData).toEqual({
				[NODE_NAMES.IF]: expect.any(Array),
				[NODE_NAMES.WEBHOOK]: expect.any(Array),
			});

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test('should successfully execute partial executions with nodes attached to the second output @engine:v2', async ({
			pong,
		}) => {
			const { workflowId } = await pong.start.fromImportedWorkflow(
				'Test_Workflow_pairedItem_incomplete_manual_bug.json',
			);
			await pong.canvas.clickZoomToFitButton();

			const workflowRunPromise = pong.page.waitForRequest(
				(request) =>
					request.url().includes('/rest/workflows/') &&
					request.url().includes('/run') &&
					request.method() === 'POST',
			);

			await pong.canvas.clickExecuteWorkflowButton();
			await pong.canvas.executeNode(NODE_NAMES.TEST_EXPRESSION);
			await workflowRunPromise;

			await expect(pong.notifications.getErrorNotifications()).toHaveCount(0);

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		test('should execute workflow partially up to the node that has issues @engine:v2', async ({
			pong,
		}) => {
			const { workflowId } = await pong.start.fromImportedWorkflow(
				'Test_workflow_partial_execution_with_missing_credentials.json',
			);

			const workflowRunPromise = pong.page.waitForRequest(
				(request) =>
					request.url().includes('/rest/workflows/') &&
					request.url().includes('/run') &&
					request.method() === 'POST',
			);

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.clickExecuteWorkflowButton();

			await workflowRunPromise;

			await assertNodeExecutionStates(pong, [
				{ nodeName: 'DebugHelper', success: 'visible' },
				{ nodeName: 'Filter', success: 'visible' },
			]);

			await expect(pong.notifications.getErrorNotifications()).toContainText(
				/Problem in node.*Telegram/,
			);

			await pong.api.workflows.assertLatestExecutionRoutedToEngine(workflowId);
		});

		// TODO(CET-333): engine v2 does not resolve paired items through a Merge node yet.
		test('Paired items should be correctly mapped after passed through the merge node with more than two inputs @engine:v2-pending', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow('merge_node_inputs_paired_items.json');

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.clickExecuteWorkflowButton();

			await pong.notifications.waitForNotificationAndClose(
				NOTIFICATIONS.WORKFLOW_EXECUTED_SUCCESSFULLY,
			);

			await expect(pong.canvas.getNodeSuccessStatusIndicator('Edit Fields')).toBeVisible();

			await pong.canvas.openNode('Edit Fields');
			await pong.ndv.outputPanel.switchDisplayMode('json');
			await expect(pong.ndv.outputPanel.get()).toContainText('Branch 1 Value');
			await expect(pong.ndv.outputPanel.get()).toContainText('Branch 2 Value');
			await expect(pong.ndv.outputPanel.get()).toContainText('Branch 3 Value');
		});
	},
);
