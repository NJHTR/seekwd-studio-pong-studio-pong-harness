import fs from 'fs';

import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import type { pongPage } from '../../../../../pages/pongPage';
import { resolveFromRoot } from '../../../../../utils/path-helper';

const DEFAULT_ZOOM_FACTOR = 1;
const ZOOM_IN_X1_FACTOR = 1.25; // Expected zoom after 1 zoom-in click (125%)
const ZOOM_IN_X2_FACTOR = 1.5625; // Expected zoom after 2 zoom-in clicks (156.25%)
const ZOOM_OUT_X1_FACTOR = 0.8; // Expected zoom after 1 zoom-out click (80%)
const ZOOM_OUT_X2_FACTOR = 0.64; // Expected zoom after 2 zoom-out clicks (64%)
const ZOOM_TOLERANCE = 0.2; // Acceptable variance for floating-point zoom comparisons

test.describe(
	'Canvas Zoom Functionality',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		const expectZoomLevel = async (pong: pongPage, expectedFactor: number) => {
			const actual = await pong.canvas.getCanvasZoomLevel();
			expect(actual).toBeGreaterThanOrEqual(expectedFactor - ZOOM_TOLERANCE);
			expect(actual).toBeLessThanOrEqual(expectedFactor + ZOOM_TOLERANCE);
		};

		test('should zoom in', async ({ pong }) => {
			await expect(pong.canvas.getZoomInButton()).toBeVisible();

			const initialZoom = await pong.canvas.getCanvasZoomLevel();

			await pong.canvas.clickZoomInButton();
			await expectZoomLevel(pong, initialZoom * ZOOM_IN_X1_FACTOR);

			await pong.canvas.clickZoomInButton();
			await expectZoomLevel(pong, initialZoom * ZOOM_IN_X2_FACTOR);
		});

		test('should zoom out', async ({ pong }) => {
			await pong.canvas.clickZoomOutButton();
			await expectZoomLevel(pong, ZOOM_OUT_X1_FACTOR);

			await pong.canvas.clickZoomOutButton();
			const finalZoom = await pong.canvas.getCanvasZoomLevel();
			expect(finalZoom).toBeGreaterThanOrEqual(ZOOM_OUT_X2_FACTOR - ZOOM_TOLERANCE);
			expect(finalZoom).toBeLessThanOrEqual(ZOOM_OUT_X2_FACTOR + ZOOM_TOLERANCE);
		});

		test('should reset zoom on keyboard shortcut', async ({ pong }) => {
			await pong.canvas.clickZoomInButton();
			await pong.page.keyboard.press('0');

			await expectZoomLevel(pong, DEFAULT_ZOOM_FACTOR);
		});

		test('should zoom to fit', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.clickZoomOutButton();
			await pong.canvas.clickZoomOutButton();

			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.canvas.clickZoomInButton();
			await pong.canvas.clickZoomInButton();

			await expect(pong.canvas.getCanvasNodes().last()).not.toBeInViewport();

			await pong.canvas.clickZoomToFitButton();

			await expect(pong.canvas.getCanvasNodes().last()).toBeInViewport();
		});

		test('should disable node (context menu or shortcut)', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.getCanvasNodes().last().click();
			await pong.page.keyboard.press('d');
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);

			await pong.canvas.disableNodeFromContextMenu(CODE_NODE_DISPLAY_NAME);
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);
		});

		test('should disable multiple nodes (context menu or shortcut)', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
			await pong.page.keyboard.press('Escape');
			await pong.page.keyboard.press('Escape');

			await pong.canvas.selectAll();
			await pong.page.keyboard.press('d');
			await expect(pong.canvas.disabledNodes()).toHaveCount(2);
			await pong.page.keyboard.press('d');
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);
			await pong.canvas.deselectAll();
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.page.keyboard.press('d');
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);
			await pong.canvas.selectAll();
			await pong.page.keyboard.press('d');
			await expect(pong.canvas.disabledNodes()).toHaveCount(2);

			await pong.canvas.selectAll();
			await pong.canvas.rightClickNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.getContextMenuItem('toggle_activation').click();
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);
			await pong.canvas.rightClickNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.getContextMenuItem('toggle_activation').click();
			await expect(pong.canvas.disabledNodes()).toHaveCount(2);
			await pong.canvas.deselectAll();
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.rightClickNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.getContextMenuItem('toggle_activation').click();
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);
			await pong.canvas.selectAll();
			await pong.canvas.rightClickNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.getContextMenuItem('toggle_activation').click();
			await expect(pong.canvas.disabledNodes()).toHaveCount(2);
		});

		test('should rename node (context menu or shortcut)', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvasComposer.renameNodeViaShortcut(CODE_NODE_DISPLAY_NAME, 'Something else');
			await expect(pong.canvas.nodeByName('Something else')).toBeAttached();

			await pong.canvas.rightClickNode('Something else');
			await pong.canvas.getContextMenuItem('rename').click();
			await expect(pong.canvas.getRenamePrompt()).toBeVisible();
			await pong.page.keyboard.type('Something different');
			await pong.page.keyboard.press('Enter');
			await expect(pong.canvas.nodeByName('Something different')).toBeAttached();
		});

		test('should allow typing space while holding Shift in rename dialog', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.getCanvasNodes().last().click();
			await pong.page.keyboard.press('F2');
			await expect(pong.canvas.getRenamePrompt()).toBeVisible();

			await pong.page.keyboard.press('ControlOrMeta+a');
			await pong.page.keyboard.type('X:');
			await pong.page.keyboard.press('Shift+Space');
			await pong.page.keyboard.type('Y');

			await expect(pong.canvas.getRenameInput()).toHaveValue('X: Y');

			await pong.page.keyboard.press('Enter');
			await expect(pong.canvas.nodeByName('X: Y')).toBeAttached();
		});

		test('should not allow empty strings for node names', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.getCanvasNodes().last().click();
			await pong.page.keyboard.press('F2');
			await expect(pong.canvas.getRenamePrompt()).toBeVisible();
			await pong.page.keyboard.press('Backspace');
			await pong.page.keyboard.press('Enter');
			await expect(pong.canvas.getRenamePrompt()).toContainText('Invalid Name');
		});

		test('should duplicate nodes (context menu or shortcut)', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME).click();
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.duplicateNode(CODE_NODE_DISPLAY_NAME);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);

			await pong.canvas.selectAll();
			await pong.page.keyboard.press('ControlOrMeta+d');
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(5);
		});

		test('should preserve connections after rename & node-view switch', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });
			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();

			await expect(
				pong.notifications.getNotificationByTitleOrContent('Workflow executed successfully'),
			).toBeVisible();
			await pong.notifications.closeNotificationByText('Workflow executed successfully');

			await pong.canvas.openExecutions();
			await expect(pong.executions.getSuccessfulExecutionItems()).toHaveCount(1);

			await pong.canvas.clickEditorTab();

			await pong.canvas.openExecutions();
			await expect(pong.executions.getSuccessfulExecutionItems()).toHaveCount(1);

			await pong.canvas.clickEditorTab();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);

			await pong.canvasComposer.renameNodeViaShortcut(CODE_NODE_DISPLAY_NAME, 'Something else');
			await expect(pong.canvas.nodeByName('Something else')).toBeAttached();

			await pong.canvasComposer.waitForWorkflowSaveAndUrl();

			await pong.canvasComposer.reloadAndWaitForCanvas();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
		});

		test('should remove unknown credentials on pasting workflow', async ({ pong }) => {
			const workflowJson = fs.readFileSync(
				resolveFromRoot('workflows', 'workflow-with-unknown-credentials.json'),
				'utf-8',
			);

			await pong.canvas.canvasPane().click();

			await pong.clipboard.paste(workflowJson);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);

			await pong.canvas.nodeByName('pong').hover();
			await pong.canvas.nodeOverflowButton('pong').click();
			await pong.canvas.getContextMenuItem('open').click();

			await expect(pong.ndv.getNodeCredentialsEmptyState()).toBeVisible();
		});

		test.fixme('should open and close the about modal on keyboard shortcut', async ({ pong }) => {
			await pong.sideBar.openAboutModalViaShortcut();
			await expect(pong.sideBar.getAboutModal()).toBeVisible();
			await pong.sideBar.closeAboutModal();
		});
	},
);
