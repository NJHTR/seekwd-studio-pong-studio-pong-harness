import {
	MANUAL_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Canvas Node Actions',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test.describe('Node Search and Add', () => {
			test('should search and add a basic node', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
				await expect(pong.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME)).toBeVisible();
			});

			test('should search and add Linear node with action', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.addNode('Linear', { action: 'Create an issue' });

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
				await expect(pong.canvas.nodeConnections()).toHaveCount(1);
				await expect(pong.canvas.nodeByName('Create an issue')).toBeVisible();
			});

			test('should search and add Webhook node (no actions)', async ({ pong }) => {
				await pong.canvas.addNode('Webhook');

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
				await expect(pong.canvas.nodeByName('Webhook')).toBeVisible();
			});

			test('should search and add Jira node with trigger', async ({ pong }) => {
				await pong.canvas.addNode('Jira Software', { trigger: 'On issue created' });
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
				await expect(pong.canvas.nodeByName('Jira Trigger')).toBeVisible();
			});

			test('should clear search and show all nodes', async ({ pong }) => {
				await pong.canvas.clickCanvasPlusButton();
				await pong.canvas.fillNodeCreatorSearchBar('Linear');
				await expect(pong.canvas.nodeCreatorNodeItem('Linear')).toBeVisible();
				const searchCount = await pong.canvas.nodeCreatorNodeItems().count();

				await pong.canvas.nodeCreatorSearchBar().clear();
				const nodeCount = await pong.canvas.nodeCreatorNodeItems().count();
				expect(nodeCount).toBeGreaterThan(searchCount);
			});

			test('should add connected node via plus endpoint', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

				await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
				await pong.canvas.fillNodeCreatorSearchBar('Code');
				await pong.page.keyboard.press('Enter');

				await pong.canvas.clickNodeCreatorItemName('Code in JavaScript');
				await pong.page.keyboard.press('Enter');
				await pong.page.keyboard.press('Escape');

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
				await expect(pong.canvas.nodeConnections()).toHaveCount(1);
			});

			test('should add disconnected node when nothing selected', async ({ pong }) => {
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.deselectAll();
				await pong.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
				await expect(pong.canvas.nodeConnections()).toHaveCount(0);
			});
		});

		test.describe('Node Creator Interactions', () => {
			test('should close node creator with escape key', async ({ pong }) => {
				await pong.canvas.clickCanvasPlusButton();
				await expect(pong.canvas.nodeCreatorSearchBar()).toBeVisible();

				await pong.page.keyboard.press('Escape');
				await expect(pong.canvas.nodeCreatorSearchBar()).toBeHidden();
			});

			test('should filter nodes by search term', async ({ pong }) => {
				await pong.canvas.clickCanvasPlusButton();
				await pong.canvas.fillNodeCreatorSearchBar('HTTP');

				const filteredItems = pong.canvas.nodeCreatorNodeItems();
				await expect(filteredItems.first()).toContainText('HTTP');
			});
		});
	},
);
