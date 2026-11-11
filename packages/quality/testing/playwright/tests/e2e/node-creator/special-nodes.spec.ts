import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Node Creator Special Nodes',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should correctly append a No Op node when Loop Over Items node is added (from add button)', async ({
			pong,
		}) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('Loop Over Items');
			await pong.canvas.nodeCreator.selectItem('Loop Over Items');
			await pong.ndv.close();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(3);
			await expect(pong.canvas.nodeByName('Loop Over Items')).toBeVisible();
			await expect(pong.canvas.nodeByName('Replace Me')).toBeVisible();
		});

		test('should correctly append a No Op node when Loop Over Items node is added (from connection)', async ({
			pong,
		}) => {
			await pong.canvas.addNode('Manual Trigger');

			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.nodeCreator.searchFor('Loop Over Items');
			await pong.canvas.nodeCreator.selectItem('Loop Over Items');
			await pong.ndv.close();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(3);
			await expect(pong.canvas.nodeByName('Loop Over Items')).toBeVisible();
			await expect(pong.canvas.nodeByName('Replace Me')).toBeVisible();
		});

		test('should add a Send and Wait for Response node', async ({ pong }) => {
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);

			await pong.canvas.nodeCreator.navigateToSubcategory('Human review');
			await pong.canvas.nodeCreator.selectItem('Slack');
			await pong.ndv.setupHelper.setParameter('operation', 'Send and Wait for Response');
			await pong.ndv.close();
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});
	},
);
