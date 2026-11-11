import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Schema Preview',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should show schema preview for regular nodes but not triggers', async ({ pong }) => {
			await pong.start.fromBlankCanvas();

			await pong.canvas.addNode('Gmail', { trigger: 'On message received' });
			await pong.ndv.close();

			await pong.canvas.addNode('Edit Fields (Set)');
			await pong.ndv.inputPanel.getNoInputDataMessage().waitFor();
			await pong.ndv.close();

			await pong.canvas.addNode('Hacker News', { action: 'Get an article' });
			await pong.ndv.close();

			await pong.canvas.addNode('Edit Fields (Set)');
			await expect(pong.ndv.inputPanel.getSchemaItem('author')).toBeVisible();
		});
	},
);
