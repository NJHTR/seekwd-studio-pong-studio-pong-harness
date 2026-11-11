import { nanoid } from 'nanoid';

import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import type { ApiHelpers } from '../../../../../services/api-helper';

async function createWorkflowWithSingleNode(api: ApiHelpers): Promise<string> {
	const { id: workflowId } = await api.workflows.createWorkflow({
		name: `Test Workflow ${nanoid()}`,
		nodes: [
			{
				id: nanoid(),
				name: 'Schedule Trigger',
				type: 'pong-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [250, 300] as [number, number],
				parameters: {},
			},
		],
		connections: {},
	});

	return String(workflowId);
}

test.describe(
	'Workflow Archive',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test('should display archived workflow in read-only mode on canvas', async ({ pong, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await pong.navigate.toWorkflow(workflowId);

			// Verify archived tag is visible
			await expect(pong.canvas.getArchivedTag()).toBeVisible();

			// Verify canvas is in read-only mode - node creator should not be available
			await expect(pong.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

			// Try to click on the canvas where plus button would be - should not open node creator
			await expect(pong.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

			// Try to interact with a node - clicking should not allow editing
			const scheduleNode = pong.canvas.nodeByName('Schedule Trigger');
			await expect(scheduleNode).toBeVisible();

			// Click the node - in read-only mode, this should not trigger edit mode
			await scheduleNode.click();

			// Node toolbar action buttons should not be present in read-only mode
			await expect(pong.canvas.nodeExecuteButton('Schedule Trigger')).not.toBeAttached();
			await expect(pong.canvas.nodeDeleteButton('Schedule Trigger')).not.toBeAttached();
			await expect(pong.canvas.nodeDisableButton('Schedule Trigger')).not.toBeAttached();

			// Try to drag a node - this should not work in read-only mode
			const nodeBox = await scheduleNode.boundingBox();
			expect(nodeBox).not.toBeNull();

			await scheduleNode.hover();
			await pong.page.mouse.down();
			await pong.page.mouse.move(nodeBox!.x + 100, nodeBox!.y + 100);
			await pong.page.mouse.up();

			const newNodeBox = await scheduleNode.boundingBox();
			expect(newNodeBox?.x).toBe(nodeBox!.x);
			expect(newNodeBox?.y).toBe(nodeBox!.y);

			// Verify that autosave does NOT trigger when attempting to edit
			// Listen for save requests - there should be none
			let saveRequestDetected = false;
			pong.page.on('request', (request) => {
				if (request.url().includes('/rest/workflows/') && request.method() === 'PATCH') {
					saveRequestDetected = true;
				}
			});

			// Wait a bit to ensure no autosave is triggered
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await pong.page.waitForTimeout(2000);

			// Verify no save request was made
			expect(saveRequestDetected).toBe(false);
		});

		test('should not trigger autosave when pasting nodes on an archived workflow', async ({
			pong,
			api,
		}) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await pong.navigate.toWorkflow(workflowId);
			await expect(pong.canvas.getArchivedTag()).toBeVisible();

			let saveRequestDetected = false;
			pong.page.on('request', (request) => {
				if (request.url().includes('/rest/workflows/') && request.method() === 'PATCH') {
					saveRequestDetected = true;
				}
			});

			const workflowData = JSON.stringify({
				nodes: [
					{
						parameters: {},
						id: 'paste-test-node',
						name: 'No Operation, do nothing',
						type: 'pong-nodes-base.noOp',
						typeVersion: 1,
						position: [300, 300],
					},
				],
				connections: {},
			});
			await pong.clipboard.paste(workflowData);

			// eslint-disable-next-line playwright/no-wait-for-timeout
			await pong.page.waitForTimeout(2000);

			expect(saveRequestDetected).toBe(false);
			await expect(pong.notifications.getErrorNotifications().first()).not.toBeAttached();
		});

		test('should not be able to archive or delete unsaved workflow', async ({ pong }) => {
			await pong.start.fromBlankCanvas();

			await expect(pong.workflowMenu.getTrigger()).toBeVisible();
			await pong.workflowMenu.open();

			await expect(pong.workflowMenu.getDeleteItem()).toBeHidden();
			await expect(pong.workflowMenu.getArchiveItemWrapper()).toHaveClass(/is-disabled/);
		});

		test('should archive nonactive workflow and then delete it', async ({ pong, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await pong.navigate.toWorkflow(workflowId);

			await expect(pong.canvas.getArchivedTag()).toBeVisible();
			await expect(pong.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

			await expect(pong.workflowMenu.getTrigger()).toBeVisible();
			await pong.workflowMenu.open();
			await pong.workflowMenu.clickDelete();
			await pong.workflowMenu.confirmDeleteModal();

			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(pong.page).toHaveURL(/\/workflows$/);
		});

		test('should archive published workflow and then delete it', async ({ pong, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await pong.navigate.toWorkflow(workflowId);
			await pong.canvas.publishWorkflow();
			// The success modal opens once the publication is confirmed via push
			await pong.workflowActivationModal.dismiss();

			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();
			await expect(pong.canvas.getArchivedTag()).not.toBeAttached();

			await expect(pong.workflowMenu.getTrigger()).toBeVisible();
			await pong.workflowMenu.open();
			await pong.workflowMenu.clickArchive();
			await pong.workflowMenu.confirmArchiveModal();

			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(pong.page).toHaveURL(/\/workflows$/);

			await pong.navigate.toWorkflow(workflowId);

			await expect(pong.canvas.getArchivedTag()).toBeVisible();
			await expect(pong.canvas.getNodeCreatorPlusButton()).not.toBeAttached();
			await expect(pong.canvas.getPublishedIndicator()).toBeHidden();

			await expect(pong.workflowMenu.getTrigger()).toBeVisible();
			await pong.workflowMenu.open();
			await pong.workflowMenu.clickDelete();
			await pong.workflowMenu.confirmDeleteModal();

			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(pong.page).toHaveURL(/\/workflows$/);
		});

		test('should archive nonactive workflow and then unarchive it', async ({ pong, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await pong.navigate.toWorkflow(workflowId);

			await expect(pong.canvas.getArchivedTag()).toBeVisible();
			await expect(pong.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

			await expect(pong.workflowMenu.getTrigger()).toBeVisible();
			await pong.workflowMenu.open();
			await pong.workflowMenu.clickUnarchive();

			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(pong.canvas.getArchivedTag()).not.toBeAttached();
			await expect(pong.canvas.getNodeCreatorPlusButton()).toBeVisible();
		});

		test('should not show unpublish menu item for non-published workflow', async ({ pong, api }) => {
			const { id: workflowId } = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [],
				connections: {},
			});
			await pong.navigate.toWorkflow(workflowId);

			await expect(pong.canvas.getPublishedIndicator()).toBeHidden();

			await pong.workflowMenu.open();
			await expect(pong.workflowMenu.getUnpublishItem()).not.toBeAttached();
		});

		// TODO: flaky test - 18 similar failures across 10 branches in last 14 days
		test.fixme('should unpublish a published workflow', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			// The success modal opens once the publication is confirmed via push
			await pong.workflowActivationModal.dismiss();

			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();

			await pong.workflowMenu.open();
			await pong.workflowMenu.clickUnpublish();

			await expect(pong.workflowMenu.getUnpublishModal()).toBeVisible();
			await pong.workflowMenu.confirmUnpublishModal();

			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(pong.canvas.getPublishedIndicator()).toBeHidden();
		});

		test('should unpublish published workflow on archive', async ({ pong, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await pong.navigate.toWorkflow(workflowId);
			await pong.canvas.publishWorkflow();
			// The success modal opens once the publication is confirmed via push
			await pong.workflowActivationModal.dismiss();

			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();

			await pong.workflowMenu.open();
			await pong.workflowMenu.clickArchive();
			await pong.workflowMenu.confirmArchiveModal();

			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(pong.page).toHaveURL(/\/workflows$/);

			await pong.navigate.toWorkflow(workflowId);

			await expect(pong.canvas.getArchivedTag()).toBeVisible();
			await expect(pong.canvas.getPublishedIndicator()).toBeHidden();
			await expect(pong.canvas.getPublishButton()).toBeHidden();

			await expect(pong.workflowMenu.getTrigger()).toBeVisible();
			await pong.workflowMenu.open();
			await pong.workflowMenu.clickUnarchive();

			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(pong.canvas.getArchivedTag()).not.toBeAttached();

			await pong.canvas.publishWorkflow();
			// The success modal opens once the publication is confirmed via push
			await pong.workflowActivationModal.dismiss();

			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();
			await expect(pong.canvas.getOpenPublishModalButton()).toBeVisible();
		});
	},
);
