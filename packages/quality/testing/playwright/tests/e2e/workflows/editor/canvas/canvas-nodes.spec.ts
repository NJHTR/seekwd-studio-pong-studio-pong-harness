import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	SWITCH_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MERGE_NODE_NAME,
	CODE_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Canvas Node Manipulation and Navigation',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should add switch node and test connections', async ({ pong }) => {
			const desiredOutputs = 4;
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(SWITCH_NODE_NAME);

			for (let i = 0; i < desiredOutputs; i++) {
				await pong.ndv.clickNodeParameterButton('Add Routing Rule');
			}

			await pong.ndv.close();

			for (let i = 0; i < desiredOutputs; i++) {
				await pong.canvas.clickNodePlusEndpoint(SWITCH_NODE_NAME);
				await expect(pong.canvas.nodeCreatorSearchBar()).toBeVisible();
				await pong.canvas.fillNodeCreatorSearchBar(EDIT_FIELDS_SET_NODE_NAME);
				await pong.canvas.clickNodeCreatorItemName(EDIT_FIELDS_SET_NODE_NAME);
				await pong.page.keyboard.press('Escape');
				await pong.canvas.clickZoomToFitButton();
			}

			await pong.canvas.canvasPane().click({ position: { x: 10, y: 10 } });

			await pong.canvas.clickNodePlusEndpoint('Edit Fields3');
			await pong.canvas.fillNodeCreatorSearchBar(SWITCH_NODE_NAME);
			await pong.canvas.clickNodeCreatorItemName(SWITCH_NODE_NAME);
			await pong.page.keyboard.press('Escape');

			await pong.canvasComposer.waitForWorkflowSaveAndUrl();

			await pong.canvasComposer.reloadAndWaitForCanvas();

			await expect(
				pong.canvas.connectionBetweenNodes('Edit Fields3', `${SWITCH_NODE_NAME}1`),
			).toBeAttached();

			const editFieldsNodes = ['Edit Fields', 'Edit Fields1', 'Edit Fields2', 'Edit Fields3'];
			for (const nodeName of editFieldsNodes) {
				await expect(pong.canvas.connectionBetweenNodes(SWITCH_NODE_NAME, nodeName)).toBeAttached();
			}
		});

		test('should add merge node and test connections', async ({ pong }) => {
			const editFieldsNodeCount = 2;

			const checkConnections = async () => {
				await expect(
					pong.canvas
						.connectionBetweenNodes(MANUAL_TRIGGER_NODE_DISPLAY_NAME, 'Edit Fields1')
						.first(),
				).toBeAttached();
				await expect(
					pong.canvas.connectionBetweenNodes('Edit Fields', MERGE_NODE_NAME).first(),
				).toBeAttached();
				await expect(
					pong.canvas.connectionBetweenNodes('Edit Fields1', MERGE_NODE_NAME).first(),
				).toBeAttached();
			};

			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();

			for (let i = 0; i < editFieldsNodeCount; i++) {
				await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
				await pong.canvas.canvasPane().click({
					position: { x: (i + 1) * 200, y: (i + 1) * 200 },
					// eslint-disable-next-line playwright/no-force-option
					force: true,
				});
			}
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.addNode(MERGE_NODE_NAME, { closeNDV: true });
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.connectNodesByDrag(MANUAL_TRIGGER_NODE_DISPLAY_NAME, 'Edit Fields1', 0, 0);
			await expect(
				pong.canvas.connectionBetweenNodes(MANUAL_TRIGGER_NODE_DISPLAY_NAME, 'Edit Fields1').first(),
			).toBeAttached();

			await pong.canvas.connectNodesByDrag('Edit Fields', MERGE_NODE_NAME, 0, 0);
			await expect(
				pong.canvas.connectionBetweenNodes('Edit Fields', MERGE_NODE_NAME).first(),
			).toBeAttached();

			await pong.canvas.connectNodesByDrag('Edit Fields1', MERGE_NODE_NAME, 0, 1);
			await expect(
				pong.canvas.connectionBetweenNodes('Edit Fields1', MERGE_NODE_NAME).first(),
			).toBeAttached();

			await pong.canvasComposer.waitForWorkflowSaveAndUrl();

			await pong.canvasComposer.reloadAndWaitForCanvas();

			await checkConnections();

			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();

			await pong.canvasComposer.reloadAndWaitForCanvas();

			await checkConnections();

			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();

			await expect(
				pong.canvas.getConnectionLabelBetweenNodes('Edit Fields1', MERGE_NODE_NAME).first(),
			).toContainText('1 item');

			await expect(pong.canvas.getNodeOutputHandle(MERGE_NODE_NAME).first()).toContainText(
				'2 items',
			);
		});

		test('should add nodes and check execution success', async ({ pong }) => {
			const nodeCount = 3;

			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();

			for (let i = 0; i < nodeCount; i++) {
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			}
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();

			await expect(pong.canvas.getSuccessEdges()).toHaveCount(nodeCount);
			await expect(pong.canvas.getAllNodeSuccessIndicators()).toHaveCount(nodeCount + 1);
			await expect(
				pong.canvas.getCanvasHandlePlusWrapperByName('Code in JavaScript2'),
			).toHaveAttribute('data-plus-type', 'success');

			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.clickZoomToFitButton();

			await expect(
				pong.canvas.getCanvasHandlePlusWrapperByName('Code in JavaScript3'),
			).not.toHaveAttribute('data-plus-type', 'success');

			await expect(pong.canvas.getSuccessEdges()).toHaveCount(nodeCount + 1);
			await expect(pong.canvas.getAllNodeSuccessIndicators()).toHaveCount(nodeCount + 1);
		});

		test('should delete node using context menu', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.deleteNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should delete node using keyboard shortcut', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
			await pong.page.keyboard.press('Backspace');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should delete node between two connected nodes', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(2);

			await pong.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
			await pong.canvas.clickZoomToFitButton();
			await pong.page.keyboard.press('Backspace');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
		});

		test('should delete multiple nodes (context menu or shortcut)', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.hitDeleteAllNodes();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);

			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.rightClickCanvas();
			await pong.canvas.getContextMenuItem('select_all').click();
			await pong.canvas.rightClickNode(CODE_NODE_DISPLAY_NAME);
			await pong.canvas.getContextMenuItem('delete').click();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);
		});

		test('should move node', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.clickZoomToFitButton();

			const pos1 = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);
			await pong.canvas.dragNodeToRelativePosition(CODE_NODE_DISPLAY_NAME, 50, 150);
			const pos2 = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

			expect(pos2.x).toBeGreaterThan(pos1.x);
			expect(pos2.y).toBeGreaterThan(pos1.y);
		});
	},
);
