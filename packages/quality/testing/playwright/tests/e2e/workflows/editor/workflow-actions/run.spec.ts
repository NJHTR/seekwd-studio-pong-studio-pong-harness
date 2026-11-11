import {
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Workflow Run',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.fixme();

		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should keep endpoint click working when switching between execution and editor tab', async ({
			pong,
		}) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

			await pong.canvas.clickNodePlusEndpoint('Edit Fields');
			await expect(pong.canvas.nodeCreatorSearchBar()).toBeVisible();
			await pong.page.keyboard.press('Escape');

			await pong.canvas.clickExecutionsTab();
			await pong.page.waitForURL(/\/executions/);

			await pong.canvas.clickEditorTab();

			await pong.canvas.clickNodePlusEndpoint('Edit Fields');
			await expect(pong.canvas.nodeCreatorSearchBar()).toBeVisible();
		});

		test('should run workflow on button click', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

			await pong.canvas.clickExecuteWorkflowButton();
			await expect(
				pong.notifications.getNotificationByTitle('Workflow executed successfully'),
			).toBeVisible();
		});

		test('should run workflow using keyboard shortcut', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

			await pong.canvas.hitExecuteWorkflow();
			await expect(
				pong.notifications.getNotificationByTitle('Workflow executed successfully'),
			).toBeVisible();
		});

		test('should not run empty workflows', async ({ pong }) => {
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);

			await expect(pong.canvas.getExecuteWorkflowButton()).not.toBeAttached();

			await pong.canvas.hitExecuteWorkflow();
			await expect(pong.notifications.getSuccessNotifications()).toHaveCount(0);
		});
	},
);
