import { test, expect } from '../../../../../fixtures/base';
import type { pongPage } from '../../../../../pages/pongPage';

// Example of using helper functions inside a test
test.describe(
	'Debug mode',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		// Manual Trigger -> `Error` Code node (disabled) -> `Code`. Toggling the `Error`
		// node decides whether a run fails, so no test here depends on the network.
		const FAILING_WORKFLOW = 'Test_workflow_4_executions_view.json';
		const FAILING_WORKFLOW_TRIGGER = "On clicking 'execute'";

		// Constants to avoid magic strings
		const URLS = {
			SUCCESS: 'https://postman-echo.com/get?foo1=bar1&foo2=bar2',
		};

		const NOTIFICATIONS = {
			EXECUTION_IMPORTED: 'Execution data imported',
			PROBLEM_IN_NODE: 'Problem in node',
			SUCCESSFUL: 'Successful',
			DATA_NOT_IMPORTED: "Some execution data wasn't imported",
		};

		test.beforeEach(async ({ pong }) => {
			await pong.api.enableFeature('debugInEditor');
		});

		// Helper function to create basic workflow
		async function createBasicWorkflow(pong: pongPage, url: string) {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('HTTP Request');
			await pong.ndv.fillParameterInput('URL', url);
			await pong.canvas.waitForSaveWorkflowCompleted();
			await pong.ndv.close();
		}

		// Helper function to import the last failed execution for debugging
		async function importLastExecutionForDebugging(pong: pongPage) {
			await pong.canvas.clickExecutionsTab();
			// Select the execution explicitly - the view only auto-selects one if the list
			// is already populated when its first fetch resolves, and never retries.
			await expect(pong.executions.getFailedExecutionItems().first()).toBeVisible();
			await pong.executions.clickLastExecutionItem();
			await pong.executions.clickDebugInEditorButton();
			// Wait on the navigation itself rather than asserting on the URL later: the
			// import pins the trigger's data, and the autosave that follows ~1.5s after
			// routes straight back out of /debug.
			await pong.page.waitForURL(/\/debug/);
			// The route change lands before the import fetches the execution, so give the
			// toast the same headroom the runs get: CI runs one pong instance for as many
			// workers as there are cores.
			await pong.notifications.waitForNotificationAndClose(NOTIFICATIONS.EXECUTION_IMPORTED, {
				timeout: 10_000,
			});
		}

		test('should enter debug mode for failed executions', async ({ pong }) => {
			await pong.start.fromImportedWorkflow(FAILING_WORKFLOW);
			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.PROBLEM_IN_NODE,
				{ timeout: 10_000 },
			);
			await importLastExecutionForDebugging(pong);
			// The execution's data is now pinned onto the editor's canvas. Asserted on the
			// badge rather than a one-shot read of every pinned name: the autosave that
			// follows the import re-renders the canvas, so a snapshot taken mid-render can
			// miss the node that was just pinned.
			await expect(pong.canvas.getNodePinnedStatusIndicator(FAILING_WORKFLOW_TRIGGER)).toBeVisible();
		});

		// TODO(CET-332): the fixture runs Code nodes, and engine v2 does not support task runners yet.
		test('should exit debug mode after successful execution @engine:v2-pending', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow(FAILING_WORKFLOW);
			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				NOTIFICATIONS.PROBLEM_IN_NODE,
				{ timeout: 10_000 },
			);
			await importLastExecutionForDebugging(pong);

			// Disable the failing node again so the next run succeeds
			await pong.canvas.toggleNodeEnabled('Error');
			await pong.canvas.waitForSaveWorkflowCompleted();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL, {
				timeout: 10_000,
			});
			await expect(pong.page).not.toHaveURL(/\/debug/);
		});

		test('should handle pinned data conflicts during execution import', async ({ pong }) => {
			await createBasicWorkflow(pong, URLS.SUCCESS);
			// Generous timeouts: these runs wait on a real request to an external host
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL, {
				timeout: 10_000,
			});
			await pong.canvasComposer.pinNodeData('HTTP Request');

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL, {
				timeout: 10_000,
			});

			// Go to executions and try to copy execution to editor
			await pong.canvas.clickExecutionsTab();
			await pong.executions.clickLastExecutionItem();
			await pong.executions.clickCopyToEditorButton();

			// Test CANCEL dialog
			await pong.executions.handlePinnedNodesConfirmation('Cancel');

			// Try again and CONFIRM
			await pong.executions.clickLastExecutionItem();
			await pong.executions.clickCopyToEditorButton();
			await pong.executions.handlePinnedNodesConfirmation('Unpin');

			expect(pong.page.url()).toContain('/debug');

			// Verify pinned status
			const pinnedNodeNames = await pong.canvas.getPinnedNodeNames();
			expect(pinnedNodeNames).not.toContain('HTTP Request');
			expect(pinnedNodeNames).toContain('When clicking ‘Execute workflow’');
		});

		test.fixme('should show error for pinned data mismatch', async ({ pong }) => {
			// Create workflow, execute, and pin data
			await createBasicWorkflow(pong, URLS.SUCCESS);
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL);

			await pong.canvasComposer.pinNodeData('HTTP Request');
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.SUCCESSFUL);

			// Delete node to create mismatch
			await pong.canvas.deleteNodeByName('HTTP Request');

			// Try to copy execution and verify error
			await attemptCopyToEditor(pong);
			await pong.notifications.waitForNotificationAndClose(NOTIFICATIONS.DATA_NOT_IMPORTED);
			expect(pong.page.url()).toContain('/debug');
		});

		async function attemptCopyToEditor(pong: pongPage) {
			await pong.canvas.clickExecutionsTab();
			await pong.executions.clickLastExecutionItem();
			await pong.executions.clickCopyToEditorButton();
		}
	},
);
