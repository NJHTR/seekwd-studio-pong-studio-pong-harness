import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Execution preview isolation',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		test('should preserve unsaved editor changes while previewing an execution', async ({
			pong,
		}) => {
			await pong.executionsComposer.createExecutions(1);

			// Make an unsaved editor change: enable the (initially disabled) Error node
			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);

			await pong.canvas.clickExecutionsTab();
			await expect(pong.executions.getExecutionItems().first()).toBeVisible();
			await pong.executions.clickLastExecutionItem();

			// The preview renders natively with the executed workflow snapshot
			await expect(pong.executions.getPreview()).toBeVisible();
			await expect(pong.executions.getPreviewCanvasNodes().first()).toBeVisible();

			// The snapshot still has the Error node disabled — the editor's unsaved
			// change must not leak into the preview
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);

			// The logs panel renders natively inside the preview
			await pong.executions.logsPanel.open();
			await expect(pong.executions.logsPanel.getOverviewStatus()).toBeVisible();

			// A node can be inspected in the read-only NDV
			await pong.canvas.openNode('Code');
			await expect(pong.ndv.container).toBeVisible();
			await expect(pong.ndv.getOutputPanel()).toBeVisible();
			await pong.ndv.clickBackToCanvasButton();

			// Back in the editor, the unsaved change (and the workflow itself) is intact
			await pong.canvas.clickEditorTab();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);
		});

		test('should keep the preview working when switching between executions', async ({ pong }) => {
			await pong.executionsComposer.createExecutions(3);

			await pong.canvas.clickExecutionsTab();
			await expect(pong.executions.getExecutionItems().first()).toBeVisible();

			await pong.executions.getExecutionItems().nth(0).click();
			await expect(pong.executions.getPreviewCanvasNodes().first()).toBeVisible();

			await pong.executions.getExecutionItems().nth(1).click();
			await expect(pong.executions.getPreviewCanvasNodes().first()).toBeVisible();

			// Switching back re-renders instantly from the already-loaded execution
			await pong.executions.getExecutionItems().nth(0).click();
			await expect(pong.executions.getPreviewCanvasNodes().first()).toBeVisible();
		});
	},
);
