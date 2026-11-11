import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Node Creator Vector Stores',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
		});

		test('should show vector stores actions', async ({ pong }) => {
			const expectedActions = [
				'Get ranked documents from vector store',
				'Add documents to vector store',
				'Retrieve documents for Chain/Tool as Vector Store',
				'Retrieve documents for AI Agent as Tool',
			];

			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.nodeCreator.searchFor('Vector Store');

			await expect(pong.canvas.nodeCreator.getNodeItems().first()).toBeVisible();

			await pong.canvas.nodeCreator.getItem('Simple Vector Store').click();

			for (const action of expectedActions) {
				await expect(pong.canvas.nodeCreator.getItem(action)).toBeVisible();
			}

			await pong.canvas.nodeCreator.goBackFromSubcategory();
			await expect(pong.canvas.nodeCreator.getNodeItems().first()).toBeVisible();
		});

		test('should find vector store nodes in creator', async ({ pong }) => {
			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.nodeCreator.searchFor('Vector Store');

			await expect(pong.canvas.nodeCreator.getNodeItems().first()).toBeVisible();
		});

		test('should search for specific vector store nodes', async ({ pong }) => {
			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.nodeCreator.searchFor('Simple Vector Store');

			await expect(pong.canvas.nodeCreator.getItem('Simple Vector Store')).toBeVisible();
		});
	},
);
