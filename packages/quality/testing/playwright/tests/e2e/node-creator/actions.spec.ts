import { test, expect } from '../../../fixtures/base';

test.describe(
	'Node Creator Actions',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should add node to canvas from actions panel', async ({ pong }) => {
			const editImageNode = 'Edit Image';

			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor(editImageNode);
			await pong.canvas.nodeCreator.selectItem(editImageNode);

			await expect(pong.canvas.nodeCreator.getActiveSubcategory()).toContainText(editImageNode);
			await pong.canvas.nodeCreator.selectItem('Crop Image');
			await expect(pong.ndv.container).toBeVisible();
			await pong.page.keyboard.press('Escape');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test('should search through actions and confirm added action', async ({ pong }) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('ftp');
			await pong.canvas.nodeCreator.selectItem('FTP');

			await expect(pong.canvas.nodeCreator.getActiveSubcategory()).toContainText('FTP');
			await pong.canvas.nodeCreator.clearSearch();
			await pong.canvas.nodeCreator.searchFor('rename');
			await pong.canvas.nodeCreator.selectItem('Rename');

			await expect(pong.ndv.container).toBeVisible();
			await pong.page.keyboard.press('Escape');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test('should show multiple actions for multi-action nodes', async ({ pong }) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('OpenWeatherMap');
			await pong.canvas.nodeCreator.selectItem('OpenWeatherMap');

			await expect(pong.canvas.nodeCreator.getActiveSubcategory()).toContainText('OpenWeatherMap');
			await expect(pong.canvas.nodeCreator.getNodeItems().first()).toBeVisible();
			await expect(pong.canvas.nodeCreator.getNodeItems().nth(1)).toBeVisible();

			await pong.canvas.nodeCreator.getNodeItems().first().click();
			await pong.page.keyboard.press('Escape');
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test('should add node with specific operation configuration', async ({ pong }) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('Slack');
			await pong.canvas.nodeCreator.selectItem('Slack');

			await expect(pong.canvas.nodeCreator.getActiveSubcategory()).toContainText('Slack');
			await pong.canvas.nodeCreator.getNodeItems().first().click();
			await pong.page.keyboard.press('Escape');
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);
		});
	},
);
