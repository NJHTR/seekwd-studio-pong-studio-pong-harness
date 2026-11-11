import { test, expect } from '../../../fixtures/base';

test.describe(
	'Node Creator Workflow Building',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should append manual trigger when adding action node from canvas add button', async ({
			pong,
		}) => {
			await pong.canvas.clickCanvasPlusButton();
			await pong.canvas.nodeCreator.searchFor('pong');
			await pong.canvas.nodeCreator.selectItem('pong', { exact: true });
			await pong.canvas.nodeCreator.selectCategoryItem('Actions');
			await pong.canvas.nodeCreator.selectItem('Create a credential');
			await pong.page.keyboard.press('Escape');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeConnections()).toHaveCount(1);
		});

		test('should append manual trigger when adding action node from plus button', async ({
			pong,
		}) => {
			await pong.canvas.clickCanvasPlusButton();
			await pong.canvas.nodeCreator.searchFor('pong');
			await pong.canvas.nodeCreator.selectItem('pong', { exact: true });
			await pong.canvas.nodeCreator.selectCategoryItem('Actions');
			await pong.canvas.nodeCreator.selectItem('Create a credential');
			await pong.page.keyboard.press('Escape');

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});
	},
);
