import { test, expect } from '../../../fixtures/base';

test.describe(
	'Schedule Trigger node',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should execute schedule trigger node and return timestamp in output', async ({ pong }) => {
			await pong.canvas.addNode('Schedule Trigger');

			await pong.ndv.execute();

			await expect(pong.ndv.outputPanel.get()).toContainText('timestamp');

			await pong.ndv.clickBackToCanvasButton();
		});
	},
);
