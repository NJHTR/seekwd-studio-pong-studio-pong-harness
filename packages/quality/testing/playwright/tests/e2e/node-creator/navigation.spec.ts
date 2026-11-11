import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Node Creator Navigation',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should open node creator on trigger tab if no trigger is on canvas', async ({ pong }) => {
			await pong.canvas.clickCanvasPlusButton();
			await expect(pong.canvas.nodeCreator.getRoot()).toBeVisible();
			await expect(pong.canvas.nodeCreator.getTriggerText()).toBeVisible();
		});

		test('should navigate subcategory and return', async ({ pong }) => {
			await pong.canvas.nodeCreator.open();

			await pong.canvas.nodeCreator.navigateToSubcategory('On app event');
			await expect(pong.canvas.nodeCreator.getActiveSubcategory()).toContainText('On app event');

			await pong.canvas.nodeCreator.goBackFromSubcategory();
			await expect(pong.canvas.nodeCreator.getActiveSubcategory()).not.toContainText('On app event');
		});

		test('should search for nodes with various queries', async ({ pong }) => {
			await pong.canvas.nodeCreator.open();

			// Assert by identity rather than exact count
			await pong.canvas.nodeCreator.searchFor('manual');
			await expect(pong.canvas.nodeCreator.getItem('Manual Trigger')).toBeVisible();

			await pong.canvas.nodeCreator.clearSearch();
			await pong.canvas.nodeCreator.searchFor('manual123');
			await expect(pong.canvas.nodeCreator.getNoResults()).toBeVisible();
			await expect(pong.canvas.nodeCreator.getNoResults()).toContainText(
				'No results for "manual123"',
			);
			await expect(pong.canvas.nodeCreator.getItem('Manual Trigger')).toBeHidden();

			await pong.canvas.nodeCreator.clearSearch();
			await pong.canvas.nodeCreator.searchFor('edit image');
			await expect(pong.canvas.nodeCreator.getItem('Edit Image')).toBeVisible();

			await pong.canvas.nodeCreator.clearSearch();
			await pong.canvas.nodeCreator.searchFor('this node totally does not exist');
			await expect(pong.canvas.nodeCreator.getNoResults()).toBeVisible();

			await pong.canvas.nodeCreator.clearSearch();
			await pong.canvas.nodeCreator.navigateToSubcategory('On app event');

			await pong.canvas.nodeCreator.searchFor('edit image');
			await expect(
				pong.canvas.nodeCreator.getCategoryItem('Results in other categories'),
			).toBeVisible();
			await expect(pong.canvas.nodeCreator.getItem('Edit Image')).toBeVisible();

			await pong.canvas.nodeCreator.clearSearch();
			await pong.canvas.nodeCreator.searchFor('edit image123123');
			await expect(pong.canvas.nodeCreator.getNoResults()).toBeVisible();
			await expect(pong.canvas.nodeCreator.getItem('Edit Image')).toBeHidden();
		});

		test('should check correct view panels after adding manual trigger', async ({ pong }) => {
			await pong.canvas.clickCanvasPlusButton();
			await expect(pong.canvas.nodeCreator.getTriggerText()).toBeVisible();
			await pong.canvas.nodeCreator.close();

			await pong.canvas.addNode('Manual Trigger');
			await expect(pong.canvas.getCanvasPlusButton()).toBeHidden();

			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await expect(pong.canvas.nodeCreator.getNextText()).toBeVisible();
		});
	},
);
