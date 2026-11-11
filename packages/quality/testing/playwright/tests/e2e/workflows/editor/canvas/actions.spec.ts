import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	AGENT_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Canvas Actions',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should add first step', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
		});

		test('should add a connected node using plus endpoint', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.fillNodeCreatorSearchBar(CODE_NODE_NAME);
			await pong.page.keyboard.press('Enter');
			await pong.canvas.clickNodeCreatorItemName(CODE_NODE_DISPLAY_NAME);
			await pong.page.keyboard.press('Enter');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
		});

		test('should add a connected node dragging from node creator', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.fillNodeCreatorSearchBar(CODE_NODE_NAME);
			await pong.page.keyboard.press('Enter');
			await pong.canvas
				.nodeCreatorSubItem(CODE_NODE_DISPLAY_NAME)
				.dragTo(pong.canvas.canvasPane(), { targetPosition: { x: 100, y: 100 } });

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
		});

		test('should add a node by dropping a DataTransfer payload on the canvas', async ({ pong }) => {
			await pong.canvas.dropNodeOnCanvas('pong-nodes-base.code');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
		});

		test('should open a category when trying to drag and drop it on the canvas', async ({
			pong,
		}) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.fillNodeCreatorSearchBar(CODE_NODE_NAME);

			const categoryItem = pong.canvas.nodeCreatorActionItems().first();
			await categoryItem.dragTo(pong.canvas.canvasPane(), {
				targetPosition: { x: 100, y: 100 },
			});

			await expect(pong.canvas.nodeCreatorCategoryItems()).toHaveCount(1);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should add node between two connected nodes', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			await pong.canvas.addNodeBetweenNodes(
				MANUAL_TRIGGER_NODE_DISPLAY_NAME,
				CODE_NODE_DISPLAY_NAME,
				HTTP_REQUEST_NODE_NAME,
			);

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(2);
		});

		test('should delete node by pressing keyboard backspace', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.page.keyboard.press('Backspace');

			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should delete connections by clicking on the delete button', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.deleteConnectionBetweenNodes(
				MANUAL_TRIGGER_NODE_DISPLAY_NAME,
				CODE_NODE_DISPLAY_NAME,
			);

			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test.describe('Node hover actions', () => {
			test('should execute node', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.deselectAll();
				await pong.canvas.executeNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);

				await expect(
					pong.notifications.getNotificationByTitle('Node executed successfully'),
				).toHaveCount(1);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
				await expect(pong.canvas.selectedNodes()).toHaveCount(0);
			});

			test('should disable and enable node', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
				await pong.canvas.deselectAll();

				const disableButton = pong.canvas.nodeDisableButton(CODE_NODE_DISPLAY_NAME);
				await disableButton.click();

				await expect(pong.canvas.disabledNodes()).toHaveCount(1);
				await expect(pong.canvas.selectedNodes()).toHaveCount(0);

				await disableButton.click();

				await expect(pong.canvas.disabledNodes()).toHaveCount(0);
				await expect(pong.canvas.selectedNodes()).toHaveCount(0);
			});

			test('should delete node', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
				await pong.canvas.deleteNodeByName(CODE_NODE_DISPLAY_NAME);

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
				await expect(pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME)).toBeVisible();
			});
		});

		test('should copy selected nodes', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvasComposer.selectAllAndCopy();
			await pong.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
			await pong.canvasComposer.copySelectedNodesWithToast();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test('should select/deselect all nodes', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.selectAll();

			await expect(pong.canvas.selectedNodes()).toHaveCount(2);

			await pong.canvas.deselectAll();
			await expect(pong.canvas.selectedNodes()).toHaveCount(0);
		});

		test('should select nodes using arrow keys', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.getCanvasNodes().first().waitFor();
			await pong.canvas.navigateNodesWithArrows('left');

			const selectedNodes = pong.canvas.selectedNodes();
			await expect(selectedNodes.first()).toHaveClass(/selected/);

			await pong.canvas.navigateNodesWithArrows('right');

			await expect(selectedNodes.last()).toHaveClass(/selected/);
		});

		test('should select nodes using shift and arrow keys', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.getCanvasNodes().first().waitFor();
			await pong.canvas.extendSelectionWithArrows('left');

			await expect(pong.canvas.selectedNodes()).toHaveCount(2);
		});

		test.describe('Node insertion positioning', () => {
			test('should not shift downstream nodes when there is enough space', async ({ pong }) => {
				// Create trigger -> code with large gap between them
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

				await pong.canvas.clickZoomToFitButton();

				// Move code node far to the right to create space
				await pong.canvas.dragNodeToRelativePosition(CODE_NODE_DISPLAY_NAME, 400, 0);

				// Get code node position before insertion
				const codePositionBefore = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

				// Insert node between trigger and code
				await pong.canvas.addNodeBetweenNodes(
					MANUAL_TRIGGER_NODE_DISPLAY_NAME,
					CODE_NODE_DISPLAY_NAME,
					HTTP_REQUEST_NODE_NAME,
				);

				// Get code node position after insertion
				const codePositionAfter = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

				// Code node should not have moved since there was enough space
				expect(codePositionAfter.x).toBe(codePositionBefore.x);
				expect(codePositionAfter.y).toBe(codePositionBefore.y);
			});

			test('should shift downstream nodes when there is not enough space', async ({ pong }) => {
				// Create trigger -> code (close together)
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

				await pong.canvas.clickZoomToFitButton();

				// Get code node position before insertion
				const codePositionBefore = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

				// Insert node between trigger and code
				await pong.canvas.addNodeBetweenNodes(
					MANUAL_TRIGGER_NODE_DISPLAY_NAME,
					CODE_NODE_DISPLAY_NAME,
					HTTP_REQUEST_NODE_NAME,
				);

				// Get code node position after insertion
				const codePositionAfter = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

				// Code node should have moved to the right
				expect(codePositionAfter.x).toBeGreaterThan(codePositionBefore.x);
			});

			test('should shift connected downstream nodes together', async ({ pong }) => {
				// Create trigger -> code -> edit fields chain
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
				await pong.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
				await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });

				await pong.canvas.clickZoomToFitButton();

				// Get positions before insertion
				const codePositionBefore = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);
				const editFieldsPositionBefore = await pong.canvas.getNodePosition('Edit Fields');

				// Insert node between trigger and code
				await pong.canvas.addNodeBetweenNodes(
					MANUAL_TRIGGER_NODE_DISPLAY_NAME,
					CODE_NODE_DISPLAY_NAME,
					HTTP_REQUEST_NODE_NAME,
				);

				// Get positions after insertion
				const codePositionAfter = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);
				const editFieldsPositionAfter = await pong.canvas.getNodePosition('Edit Fields');

				// Both downstream nodes should have moved by approximately the same amount
				const codeDeltaX = codePositionAfter.x - codePositionBefore.x;
				const editFieldsDeltaX = editFieldsPositionAfter.x - editFieldsPositionBefore.x;

				expect(codeDeltaX).toBeGreaterThan(0);
				expect(editFieldsDeltaX).toBeGreaterThan(0);
				// They should move by similar amounts (within tolerance for rounding)
				expect(Math.abs(codeDeltaX - editFieldsDeltaX)).toBeLessThan(20);
			});

			test('should shift downstream nodes correctly when inserting configurable nodes like AI Agent', async ({
				pong,
			}) => {
				// Create trigger -> code (close together)
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

				await pong.canvas.clickZoomToFitButton();

				// Get code node position before insertion
				const codePositionBefore = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

				// Insert AI Agent (a configurable/wider node) between trigger and code
				await pong.canvas.addNodeBetweenNodes(
					MANUAL_TRIGGER_NODE_DISPLAY_NAME,
					CODE_NODE_DISPLAY_NAME,
					AGENT_NODE_NAME,
				);

				// Get positions after insertion
				const codePositionAfter = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);
				const agentPosition = await pong.canvas.getNodePosition(AGENT_NODE_NAME);

				// Code node should have moved to the right
				expect(codePositionAfter.x).toBeGreaterThan(codePositionBefore.x);

				// AI Agent node should be positioned between trigger and code (not overlapping)
				// AI Agent is 256px wide, so its right edge should be left of code node
				// Agent position is top-left, so right edge is agentPosition.x + 256
				const agentRightEdge = agentPosition.x + 256;
				expect(agentRightEdge).toBeLessThan(codePositionAfter.x);
			});

			test('should not shift downstream nodes when there is enough space for configurable nodes', async ({
				pong,
			}) => {
				// Create trigger -> code with large gap between them
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

				await pong.canvas.clickZoomToFitButton();

				// Move code node far to the right to create space for AI Agent (which is 256px wide)
				await pong.canvas.dragNodeToRelativePosition(CODE_NODE_DISPLAY_NAME, 500, 0);

				// Get code node position before insertion
				const codePositionBefore = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

				// Insert AI Agent between trigger and code
				await pong.canvas.addNodeBetweenNodes(
					MANUAL_TRIGGER_NODE_DISPLAY_NAME,
					CODE_NODE_DISPLAY_NAME,
					AGENT_NODE_NAME,
				);

				// Get code node position after insertion
				const codePositionAfter = await pong.canvas.getNodePosition(CODE_NODE_DISPLAY_NAME);

				// Code node should not have moved since there was enough space
				expect(codePositionAfter.x).toBe(codePositionBefore.x);
				expect(codePositionAfter.y).toBe(codePositionBefore.y);
			});
		});
	},
);
