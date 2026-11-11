import { test, expect } from '../../../../../fixtures/base';
import type { TestRequirements } from '../../../../../Types';

const NODES = {
	MANUAL_TRIGGER: 'Manual Trigger',
	SCHEDULE_TRIGGER: 'Schedule Trigger',
	WEBHOOK: 'Webhook',
	HTTP_REQUEST: 'HTTP Request',
	PIPEDRIVE: 'Pipedrive',
	EDIT_FIELDS: 'Edit Fields (Set)', // Use the full node name that appears in the Node List, although when it's added to the canvas it's called "Edit Fields"
	CODE: 'Code',
	END: 'End',
};

const webhookTestRequirements: TestRequirements = {
	workflow: {
		'Test_workflow_webhook_with_pin_data.json': 'Test',
	},
};

const pinnedWebhookRequirements: TestRequirements = {
	workflow: {
		'Pinned_webhook_node.json': 'Test',
	},
};

test.describe(
	'Data pinning',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		const maxPinnedDataSize = 16384;

		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test.describe('Pin data operations', () => {
			test('should be able to pin node output', async ({ pong }) => {
				await pong.canvas.addNode(NODES.SCHEDULE_TRIGGER);

				await pong.ndv.execute();
				await expect(pong.ndv.outputPanel.get()).toBeVisible();

				const prevValue = await pong.ndv.outputPanel.getTbodyCell(0, 0).textContent();

				await pong.ndv.togglePinData();
				await pong.ndv.close();

				// Execute workflow and verify pinned data persists
				await pong.canvas.clickExecuteWorkflowButton();
				await pong.canvas.openNode(NODES.SCHEDULE_TRIGGER);

				await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText(prevValue ?? '');
			});

			test('should show the pinned indicator after running the workflow @engine:v2', async ({
				pong,
			}) => {
				await pong.canvas.addNode(NODES.SCHEDULE_TRIGGER);

				await pong.ndv.execute();
				await expect(pong.ndv.outputPanel.get()).toBeVisible();

				await pong.ndv.togglePinData();
				await pong.ndv.close();

				await pong.workflowComposer.executeWorkflowAndWaitForNotification('Successful');

				await expect(pong.canvas.getNodePinnedStatusIndicator(NODES.SCHEDULE_TRIGGER)).toBeVisible();
				await expect(pong.canvas.getNodeSuccessStatusIndicator(NODES.SCHEDULE_TRIGGER)).toBeHidden();
			});

			test('should be able to set custom pinned data', async ({ pong }) => {
				await pong.canvas.addNode(NODES.SCHEDULE_TRIGGER);

				await expect(pong.ndv.getEditPinnedDataButton()).toBeVisible();
				await expect(pong.ndv.outputPanel.getPinDataButton()).toBeHidden();

				await pong.ndv.setPinnedData([{ test: 1 }]);

				await expect(pong.ndv.outputPanel.getTableRows()).toHaveCount(2);
				await expect(pong.ndv.outputPanel.getTableHeaders()).toHaveCount(2);
				await expect(pong.ndv.outputPanel.getTableHeaders().first()).toContainText('test');
				await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');

				await pong.ndv.close();
				await pong.canvas.openNode(NODES.SCHEDULE_TRIGGER);

				await expect(pong.ndv.outputPanel.getTableHeaders().first()).toContainText('test');
				await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');
			});

			test('should display pin data edit button for Webhook node', async ({ pong }) => {
				await pong.canvas.addNode(NODES.WEBHOOK);

				await expect(pong.ndv.getEditOutputButton()).toBeVisible();
			});

			test('should duplicate pinned data when duplicating node', async ({ pong }) => {
				await pong.canvas.addNode(NODES.SCHEDULE_TRIGGER);
				await pong.ndv.close();

				await pong.canvas.addNode(NODES.EDIT_FIELDS);

				await expect(pong.ndv.container).toBeVisible();

				await expect(pong.ndv.getEditPinnedDataButton()).toBeVisible();
				await expect(pong.ndv.outputPanel.getPinDataButton()).toBeHidden();

				await pong.ndv.setPinnedData([{ test: 1 }]);
				await pong.ndv.close();

				await pong.canvas.duplicateNode('Edit Fields');
				await pong.canvas.openNode('Edit Fields1');

				await expect(pong.ndv.outputPanel.getTableHeader(0)).toContainText('test');
				await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('1');
			});
		});

		test.describe('Error handling', () => {
			test('should show error when maximum pin data size is exceeded', async ({ pong }) => {
				await pong.page.evaluate((maxSize) => {
					(window as { maxPinnedDataSize?: number }).maxPinnedDataSize = maxSize;
				}, maxPinnedDataSize);

				const actualMaxSize = await pong.page.evaluate(() => {
					return (window as { maxPinnedDataSize?: number }).maxPinnedDataSize;
				});
				expect(actualMaxSize).toBe(maxPinnedDataSize);

				await pong.canvas.addNode(NODES.SCHEDULE_TRIGGER);
				await pong.ndv.close();

				await pong.canvas.addNode(NODES.EDIT_FIELDS);

				await expect(pong.ndv.container).toBeVisible();
				await expect(pong.ndv.getEditPinnedDataButton()).toBeVisible();
				await expect(pong.ndv.outputPanel.getPinDataButton()).toBeHidden();

				const largeData = [{ test: '1'.repeat(maxPinnedDataSize + 1000) }];
				await pong.ndv.setPinnedData(largeData);

				await expect(
					pong.notifications.getNotificationByContent(
						'Workflow has reached the maximum allowed pinned data size',
					),
				).toBeVisible();
			});

			test('should show error when pin data JSON is invalid', async ({ pong }) => {
				await pong.canvas.addNode(NODES.SCHEDULE_TRIGGER);
				await pong.ndv.close();

				await pong.canvas.addNode(NODES.EDIT_FIELDS);

				await expect(pong.ndv.container).toBeVisible();
				await expect(pong.ndv.getEditPinnedDataButton()).toBeVisible();
				await expect(pong.ndv.outputPanel.getPinDataButton()).toBeHidden();

				await pong.ndv.setPinnedData('[ { "name": "First item", "code": 2dsa }]');

				await expect(
					pong.notifications.getNotificationByTitle('Unable to save due to invalid JSON'),
				).toBeVisible();
			});
		});

		test.describe('Advanced pinning scenarios', () => {
			test('should be able to reference paired items in node before pinned data', async ({
				pong,
			}) => {
				await pong.canvas.addNode(NODES.MANUAL_TRIGGER);

				await pong.canvas.addNode(NODES.HTTP_REQUEST);
				await pong.ndv.setPinnedData([{ http: 123 }]);
				await pong.ndv.close();

				await pong.canvas.addNode(NODES.PIPEDRIVE, { action: 'Create an activity' });
				await pong.ndv.setPinnedData(Array(3).fill({ pipedrive: 123 }));
				await pong.ndv.close();

				await pong.canvas.addNode(NODES.EDIT_FIELDS);

				await pong.ndv.execute();

				await expect(pong.ndv.getNodeParameters()).toBeVisible();

				await expect(pong.ndv.getAssignmentCollectionAdd('assignments')).toBeVisible();
				await pong.ndv.getAssignmentCollectionAdd('assignments').click();
				await pong.ndv.clickAssignmentExpressionToggle('assignments');

				const expressionInput = pong.ndv.getInlineExpressionEditorInput();
				await expressionInput.click();
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor(`{{ $('${NODES.HTTP_REQUEST}').item`);

				const hint = pong.ndv.getParameterInputHint();
				await expect(hint).toContainText('"http": 123');
				await expect(hint).toContainText('pairedItem');
			});

			test('should use pin data in manual webhook executions', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(webhookTestRequirements);
				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');
				await expect(pong.canvas.getExecuteWorkflowButton()).toHaveAccessibleName(
					'Execute workflow from Webhook',
				);

				const webhookPath = '/webhook-test/b0d79ddb-df2d-49b1-8555-9fa2b482608f';
				const response = await pong.ndv.makeWebhookRequest(webhookPath);
				expect(response.status()).toBe(200);

				await pong.canvas.openNode(NODES.END);

				await expect(pong.ndv.outputPanel.getTableRow(1)).toBeVisible();
				await expect(pong.ndv.outputPanel.getTableRow(1)).toContainText('pin-overwritten');
			});

			// Flaky in multi-main mode due to webhook registration timing issues
			test.fixme(
				'should not use pin data in production webhook executions',
				async ({ pong, setupRequirements }) => {
					await setupRequirements(webhookTestRequirements);
					await pong.canvas.publishWorkflow();
					const webhookUrl = '/webhook/b0d79ddb-df2d-49b1-8555-9fa2b482608f';
					const response = await pong.ndv.makeWebhookRequest(webhookUrl);
					expect(response.status(), 'Webhook response is: ' + (await response.text())).toBe(200);

					const responseBody = await response.json();
					expect(responseBody).toEqual({ nodeData: 'pin' });
				},
			);

			test('should not show pinned data tooltip', async ({ pong, setupRequirements }) => {
				await setupRequirements(pinnedWebhookRequirements);
				await pong.canvas.clickExecuteWorkflowButton();

				await pong.canvas.getCanvasNodes().first().click();

				const poppers = pong.ndv.getVisiblePoppers();
				await expect(poppers).toHaveCount(0);
			});
		});
	},
);
