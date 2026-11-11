import fs from 'fs';

import {
	SCHEDULE_TRIGGER_NODE_NAME,
	CODE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';

test.describe(
	'Undo/Redo',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should undo/redo deleting node using context menu', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.clickZoomToFitButton();

			await pong.canvas.deleteNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should undo/redo deleting node using keyboard shortcut', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
			await pong.canvas.clickZoomToFitButton();
			await pong.page.keyboard.press('Backspace');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should undo/redo deleting node between two connected nodes', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
			await pong.canvas.nodeByName(CODE_NODE_DISPLAY_NAME).click();
			await pong.canvas.clickZoomToFitButton();
			await pong.page.keyboard.press('Backspace');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(2);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
		});

		test('should undo/redo deleting whole workflow', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.page.keyboard.press('Escape');
			await pong.page.keyboard.press('Escape');

			await pong.canvas.hitDeleteAllNodes();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should undo/redo moving nodes', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();

			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.clickZoomToFitButton();

			const codeNodeName = CODE_NODE_DISPLAY_NAME;

			const initialPosition = await pong.canvas.getNodePosition(codeNodeName);

			await pong.canvas.dragNodeToRelativePosition(codeNodeName, 50, 150);

			const newPosition = await pong.canvas.getNodePosition(codeNodeName);
			expect(newPosition.x).toBeGreaterThan(initialPosition.x);
			expect(newPosition.y).toBeGreaterThan(initialPosition.y);

			await pong.canvas.hitUndo();
			const undoPosition = await pong.canvas.getNodePosition(codeNodeName);
			expect(undoPosition.x).toBeCloseTo(initialPosition.x, 1);
			expect(undoPosition.y).toBeCloseTo(initialPosition.y, 1);

			await pong.canvas.hitRedo();
			const redoPosition = await pong.canvas.getNodePosition(codeNodeName);
			expect(redoPosition.x).toBeGreaterThan(initialPosition.x);
			expect(redoPosition.y).toBeGreaterThan(initialPosition.y);
		});

		test('should undo/redo deleting a connection using context menu', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.deleteConnectionBetweenNodes(
				SCHEDULE_TRIGGER_NODE_NAME,
				CODE_NODE_DISPLAY_NAME,
			);
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.nodeConnections()).toHaveCount(0);
		});

		test('should undo/redo disabling a node using context menu', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.disableNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);
		});

		test('should undo/redo disabling a node using keyboard shortcut', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.getCanvasNodes().last().click();
			await pong.page.keyboard.press('d');

			await expect(pong.canvas.disabledNodes()).toHaveCount(1);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);
		});

		test('should undo/redo disabling multiple nodes', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.page.keyboard.press('Escape');
			await pong.page.keyboard.press('Escape');

			await pong.canvas.selectAll();
			await pong.page.keyboard.press('d');

			await expect(pong.canvas.disabledNodes()).toHaveCount(2);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.disabledNodes()).toHaveCount(2);
		});

		test('should undo/redo duplicating a node', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.duplicateNode(CODE_NODE_DISPLAY_NAME);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
		});

		test('should undo/redo pasting nodes', async ({ pong }) => {
			const workflowJson = fs.readFileSync(
				resolveFromRoot('workflows', 'Test_workflow-actions_paste-data.json'),
				'utf-8',
			);

			await pong.canvas.canvasPane().click();
			await pong.clipboard.paste(workflowJson);
			await pong.canvas.clickZoomToFitButton();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(5);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);

			await pong.canvas.hitRedo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(5);
		});

		test('should be able to copy and paste pinned data nodes in workflows with dynamic Switch node', async ({
			pong,
		}) => {
			const workflowJson = fs.readFileSync(
				resolveFromRoot('workflows', 'Test_workflow_form_switch.json'),
				'utf-8',
			);

			await pong.canvas.canvasPane().click();
			await pong.clipboard.paste(workflowJson);
			await pong.canvas.clickZoomToFitButton();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
			await expect(pong.canvas.getNodeInputHandles('Switch')).toHaveCount(1);

			// Wait for clipboard paste throttling
			await pong.page.waitForTimeout(1000);

			await pong.canvas.canvasPane().click();
			await pong.clipboard.paste(workflowJson);

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
			await expect(pong.canvas.nodeConnections()).toHaveCount(2);

			await pong.canvas.hitUndo();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
			await expect(pong.canvas.getNodeInputHandles('Switch')).toHaveCount(1);
		});

		test('should not undo/redo when NDV or a modal is open', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await pong.ndv.clickBackToCanvasButton();

			await pong.sideBar.clickAboutMenuItem();
			await expect(pong.sideBar.getAboutModal()).toBeVisible();
			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
			await pong.sideBar.closeAboutModal();

			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);
		});

		test('should not undo/redo when NDV or a prompt is open', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.clickWorkflowMenu();
			await pong.canvas.clickImportFromURL();

			await pong.canvas.getImportURLInput().click();
			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);

			await pong.canvas.clickCancelImportURL();
			await pong.canvas.hitUndo();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);
		});
	},
);
