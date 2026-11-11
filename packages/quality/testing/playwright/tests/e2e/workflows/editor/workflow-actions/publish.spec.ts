import {
	MANUAL_TRIGGER_NODE_NAME,
	NOTION_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Workflow Publish',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should not be able to publish workflow without trigger node', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.waitForSaveWorkflowCompleted();

			await expect(pong.canvas.getOpenPublishModalButton()).toBeDisabled();
		});

		test('should be able to publish workflow', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.waitForSaveWorkflowCompleted();

			await expect(pong.canvas.getPublishedIndicator()).toBeHidden();

			await pong.canvas.publishWorkflow();

			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();
		});

		test('should not be able to publish workflow when nodes have errors', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
			await pong.canvas.waitForSaveWorkflowCompleted();

			await expect(pong.canvas.getOpenPublishModalButton()).toBeDisabled();
		});

		test('should be able to publish workflow when nodes with errors are disabled', async ({
			pong,
		}) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
			await pong.canvas.waitForSaveWorkflowCompleted();

			await expect(pong.canvas.getOpenPublishModalButton()).toBeDisabled();

			const nodeName = await pong.canvas.getCanvasNodes().last().getAttribute('data-node-name');
			await pong.canvas.toggleNodeEnabled(nodeName!);
			await pong.canvas.waitForSaveWorkflowCompleted();

			await pong.canvas.publishWorkflow();

			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();
		});

		test.describe('Webhook conflict validation', () => {
			const cleanupWorkflowIds: string[] = [];

			test.afterEach(async ({ api }) => {
				while (cleanupWorkflowIds.length > 0) {
					try {
						// delete workflows created during tests. If a happy path test is flacky, it would fail on next execution
						// due to webhook conflicts if the created workflow/webhooks is still active
						const workflowId = cleanupWorkflowIds.pop();
						await api.workflows.deactivate(workflowId!);
						await api.workflows.delete(workflowId!);
					} catch {
						// ignore potential errors in the cleanup process
					}
				}
			});

			test('successfully publishes a workflow without webhook conflicts', async ({ api }) => {
				const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
					'webhook-origin-isolation.json',
				);

				cleanupWorkflowIds.push(workflowId);

				await expect(
					api.workflows.activate(workflowId, createdWorkflow.versionId!),
				).resolves.not.toThrow();
			});

			test('successfully publishes a workflow containing wait node', async ({ api }) => {
				const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
					'webhook-publish-with-wait-node.json',
				);

				cleanupWorkflowIds.push(workflowId);

				await expect(
					api.workflows.activate(workflowId, createdWorkflow.versionId!),
				).resolves.not.toThrow();
			});

			test('Rejects publishing a workflow containing webhook conflicts with published workflow', async ({
				api,
			}) => {
				const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
					'webhook-publish-no-conflicts.json',
					{ makeUnique: false },
				);
				cleanupWorkflowIds.push(workflowId);
				await api.workflows.activate(workflowId, createdWorkflow.versionId!);

				const { workflowId: workflowId2, createdWorkflow: createdWorkflow2 } =
					await api.workflows.importWorkflowFromFile('webhook-publish-no-conflicts.json', {
						makeUnique: false,
						transform: ({ id, ...workflow }) => ({
							...workflow,
							id: Date.now().toString(),
						}),
					});
				cleanupWorkflowIds.push(workflowId2);

				await expect(
					api.workflows.activate(workflowId2, createdWorkflow2.versionId!),
				).rejects.toThrow('There is a conflict with one of the webhooks');
			});

			test('Rejects publishing a workflow containing local conflicts', async ({ api }) => {
				const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
					'webhook-publish-local-conflict.json',
					{ makeUnique: false },
				);
				cleanupWorkflowIds.push(workflowId);

				await expect(
					api.workflows.activate(workflowId, createdWorkflow.versionId!),
				).rejects.toThrow('There is a conflict with one of the webhooks');
			});
		});
	},
);
