import {
	CODE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should show up when double clicked on a node and close when Back to canvas clicked', async ({
			pong,
		}) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			const canvasNodes = pong.canvas.getCanvasNodes();
			await canvasNodes.first().dblclick();
			await expect(pong.ndv.container).toBeVisible();
			await pong.ndv.clickBackToCanvasButton();
			await expect(pong.ndv.container).toBeHidden();
		});

		test('should show input panel when node is not connected', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.deselectAll();
			await pong.canvas.addNode('Edit Fields (Set)', { closeNDV: true });
			const canvasNodes = pong.canvas.getCanvasNodes();
			await canvasNodes.last().dblclick();
			await expect(pong.ndv.container).toBeVisible();
			await expect(pong.ndv.inputPanel.get()).toContainText('No input connected');
		});

		test('should change input and go back to canvas', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('NDV-test-select-input.json');
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.getCanvasNodes().last().dblclick();
			await pong.ndv.execute();

			await pong.ndv.inputPanel.switchDisplayMode('table');

			await pong.ndv.inputPanel.getNodeInputOptions().last().click();

			await expect(pong.ndv.inputPanel.get()).toContainText('start');

			await pong.ndv.clickBackToCanvasButton();
			await expect(pong.ndv.container).toBeHidden();
		});

		test('should show correct validation state for resource locator params', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Typeform Trigger', { closeNDV: false });
			await expect(pong.ndv.container).toBeVisible();

			await pong.ndv.clickBackToCanvasButton();

			await pong.canvas.openNode('Typeform Trigger');
			await expect(pong.canvas.getNodeIssuesByName('Typeform Trigger')).toBeVisible();
		});

		test('should show validation errors only after blur or re-opening of NDV', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Airtable', { closeNDV: false, action: 'Search records' });
			await expect(pong.ndv.container).toBeVisible();

			await expect(pong.canvas.getNodeIssuesByName('Airtable')).toBeHidden();

			await pong.ndv.getParameterInputField('table').nth(1).focus();
			await pong.ndv.getParameterInputField('table').nth(1).blur();
			await pong.ndv.getParameterInputField('base').nth(1).focus();
			await pong.ndv.getParameterInputField('base').nth(1).blur();

			await expect(pong.ndv.getParameterInput('base')).toHaveClass(/has-issues|error|invalid/);
			await expect(pong.ndv.getParameterInput('table')).toHaveClass(/has-issues|error|invalid/);

			await pong.ndv.clickBackToCanvasButton();

			await pong.canvas.openNode('Search records');
			await expect(pong.canvas.getNodeIssuesByName('Search records')).toBeVisible();
		});

		test('should show all validation errors when opening pasted node', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_ndv_errors.json');
			const canvasNodes = pong.canvas.getCanvasNodes();
			await expect(canvasNodes).toHaveCount(1);

			await pong.canvas.openNode('Airtable');
			await expect(pong.canvas.getNodeIssuesByName('Airtable')).toBeVisible();
		});

		test('should render run errors correctly', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_ndv_run_error.json');
			await pong.canvas.openNode('Error');
			await pong.ndv.execute();

			await expect(pong.ndv.getNodeRunErrorMessage()).toHaveText(
				"Paired item data for item from node 'Break pairedItem chain' is unavailable. Ensure 'Break pairedItem chain' is providing the required output. [item 0]",
			);

			await expect(pong.ndv.getNodeRunErrorDescription()).toContainText(
				"An expression here won't work because it uses .item and pong can't figure out the matching item.",
			);

			await expect(pong.ndv.getNodeRunErrorMessage()).toBeVisible();
			await expect(pong.ndv.getNodeRunErrorDescription()).toBeVisible();
		});

		test('webhook should fallback to webhookId if path is empty', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Webhook', { closeNDV: false });

			await expect(pong.canvas.getNodeIssuesByName('Webhook')).toBeHidden();
			await expect(pong.ndv.getExecuteNodeButton()).toBeEnabled();
			await expect(pong.ndv.getTriggerPanelExecuteButton()).toBeVisible();

			await pong.ndv.getParameterInputField('path').clear();

			const webhookUrlsContainer = pong.ndv.getWebhookUrlsContainer();
			const urlText = await webhookUrlsContainer.textContent();
			const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
			expect(urlText).toMatch(uuidRegex);

			await pong.ndv.close();

			await pong.canvas.openNode('Webhook');
			await pong.ndv.fillParameterInput('path', 'test-path');

			const updatedUrlText = await webhookUrlsContainer.textContent();
			expect(updatedUrlText).toContain('test-path');
			expect(updatedUrlText).not.toMatch(uuidRegex);
		});

		test('should properly show node execution indicator', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: false });

			await expect(pong.ndv.getNodeRunSuccessIndicator()).toBeHidden();
			await expect(pong.ndv.getNodeRunErrorIndicator()).toBeHidden();
			await expect(pong.ndv.getNodeRunTooltipIndicator()).toBeHidden();

			await pong.ndv.execute();

			await expect(pong.ndv.getNodeRunSuccessIndicator()).toBeVisible();
			await expect(pong.ndv.getNodeRunTooltipIndicator()).toBeVisible();
		});

		test('should show node name and version in settings', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_ndv_version.json');

			await pong.canvas.openNode('Edit Fields (old)');
			await pong.ndv.openSettings();
			await expect(pong.ndv.getNodeVersion()).toContainText('Set node version 2');
			await expect(pong.ndv.getNodeVersion()).toContainText('Latest version: 3.5');
			await pong.ndv.close();

			await pong.canvas.openNode('Edit Fields (latest)');
			await pong.ndv.openSettings();
			await expect(pong.ndv.getNodeVersion()).toContainText('Edit Fields (Set) node version 3.4');
			await expect(pong.ndv.getNodeVersion()).toContainText('Latest');
			await pong.ndv.close();

			await pong.canvas.openNode('Cron');
			await pong.ndv.openSettings();
			await expect(pong.ndv.getNodeVersion()).toContainText('Cron node version 1');
			await expect(pong.ndv.getNodeVersion()).toContainText('Deprecated');
			await pong.ndv.close();
		});

		test('should not push NDV header out with a lot of code in Code node editor', async ({
			pong,
		}) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: false });

			const codeEditor = pong.ndv.getCodeEditor();
			await codeEditor.click();
			await pong.page.keyboard.press('ControlOrMeta+a');
			await pong.page.keyboard.press('Delete');

			const dummyCode = Array(50)
				.fill(
					'console.log("This is a very long line of dummy JavaScript code that should not push the NDV header out of view");',
				)
				.join('\n');

			await codeEditor.fill(dummyCode);

			await expect(pong.ndv.getExecuteNodeButton()).toBeVisible();
		});

		test('should allow editing code in fullscreen in the code editors', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: false });

			await pong.ndv.openCodeEditorFullscreen();

			const fullscreenEditor = pong.ndv.getCodeEditorFullscreen();
			await fullscreenEditor.click();
			await pong.page.keyboard.press('ControlOrMeta+a');
			await fullscreenEditor.fill('foo()');

			await expect(fullscreenEditor).toContainText('foo()');

			await pong.ndv.closeCodeEditorDialog();

			await expect(pong.ndv.getCodeEditor()).toContainText('foo()');
		});

		test.describe('Complex Edge Cases', () => {
			test('ADO-2931 - should handle multiple branches of the same input with the first branch empty correctly', async ({
				pong,
			}) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.importWorkflow(
					'Test_ndv_two_branches_of_same_parent_false_populated.json',
					'Multiple Branches Test',
				);

				await pong.canvas.openNode('DebugHelper');
				await expect(pong.ndv.inputPanel.get()).toBeVisible();
				await expect(pong.ndv.outputPanel.get()).toBeVisible();

				await pong.ndv.execute();

				await expect(pong.ndv.inputPanel.getSchemaItem('a1')).toBeVisible();
			});
		});

		test.describe('Execution Indicators - Multi-Node', () => {
			test('should properly show node execution indicator for multiple nodes', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
				await pong.ndv.clickBackToCanvasButton();

				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await pong.canvas.openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
				await expect(pong.ndv.getNodeRunSuccessIndicator()).toBeVisible();
				await expect(pong.ndv.getNodeRunTooltipIndicator()).toBeVisible();

				await pong.ndv.clickBackToCanvasButton();
				await pong.canvas.openNode(CODE_NODE_DISPLAY_NAME);
				await expect(pong.ndv.getNodeRunSuccessIndicator()).toBeVisible();
			});
		});
	},
);
