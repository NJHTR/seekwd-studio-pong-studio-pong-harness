import {
	EDIT_FIELDS_SET_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../../config/constants';
import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Routing',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should ask to save unsaved changes before leaving route', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('manual-trigger-with-code.json');
			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

			await pong.sideBar.clickHomeButton();

			await expect(pong.page).toHaveURL(/workflow/);

			await expect(pong.canvas.saveChangesModal.getModal()).toBeVisible();
			await pong.canvas.saveChangesModal.clickCancel();

			await expect(pong.page).toHaveURL(/home\/workflows/);
		});

		test('should correct route after cancelling saveChangesModal', async ({ pong }) => {
			await pong.goHome();
			await pong.sideBar.addWorkflowFromUniversalAdd('Personal');

			await pong.canvas.importWorkflow('manual-trigger-with-code.json', 'Test Workflow');

			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });

			await pong.page.goBack();

			await expect(pong.page).toHaveURL(/home\/workflows/);

			await expect(pong.canvas.saveChangesModal.getModal()).toBeVisible();
			await pong.canvas.saveChangesModal.clickClose();

			await expect(pong.page).toHaveURL(/workflow/);
		});

		test('should correct route when opening and closing NDV', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('manual-trigger-with-code.json');

			const baselineUrl = pong.page.url();

			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });

			expect(pong.page.url()).not.toBe(baselineUrl);

			await pong.page.keyboard.press('Escape');

			expect(pong.page.url()).toBe(baselineUrl);
		});

		test('should open ndv via URL', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('manual-trigger-with-code.json');

			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });
			const ndvUrl = pong.page.url();

			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();

			await expect(pong.ndv.container).toBeHidden();

			await pong.page.goto(ndvUrl);

			await expect(pong.ndv.container).toBeVisible();
		});

		test('should open show warning and drop nodeId from URL if it contained an unknown nodeId', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow('manual-trigger-with-code.json');

			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: false });
			const ndvUrl = pong.page.url();

			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();

			await expect(pong.ndv.container).toBeHidden();

			await pong.page.goto(ndvUrl + 'thisMessesUpTheNodeId');

			await expect(pong.notifications.getWarningNotifications()).toBeVisible();

			const urlWithoutNodeId = ndvUrl.split('/').slice(0, -1).join('/');
			expect(pong.page.url()).toBe(urlWithoutNodeId);
		});

		test('should load existing workflow when navigating with ?new=true', async ({ pong }) => {
			await pong.start.fromBlankCanvas();

			// Create and save a workflow with a node
			const workflowName = 'Test Existing Workflow';
			await pong.canvas.setWorkflowName(workflowName);
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.waitForSaveWorkflowCompleted();

			// Get the workflow ID from the URL
			const workflowId = pong.canvas.getWorkflowIdFromUrl();
			expect(workflowId).toBeTruthy();

			// Navigate to the workflow with ?new=true query parameter
			// janitor-disable-next-line no-raw-editor-navigation -- test exercises ?new=true URL routing directly; loader awaited below
			await pong.page.goto(`/workflow/${workflowId}?new=true`);

			// Wait for the canvas to load
			await expect(pong.canvas.getNodeViewLoader()).not.toBeAttached();

			// Verify the existing workflow was loaded (not a blank canvas)
			await expect(pong.canvas.getWorkflowName()).toHaveAttribute('title', workflowName);

			// Verify the previously added node is present
			const scheduleNode = pong.canvas.nodeByName(SCHEDULE_TRIGGER_NODE_NAME);
			await expect(scheduleNode).toBeVisible();
		});
	},
);
