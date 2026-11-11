import { test, expect } from '../../../fixtures/base';

test.describe(
	'AI-716 Correctly set up agent model shows error',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test('should not show error when adding a sub-node with credential set-up', async ({ pong }) => {
			await pong.start.fromBlankCanvas();

			await pong.canvas.addNode('AI Agent');

			await pong.page.keyboard.press('Escape');

			await pong.canvas.addNode('OpenAI Chat Model');

			await pong.credentialsComposer.createFromNdv({
				apiKey: 'sk-123',
			});

			await pong.page.keyboard.press('Escape');

			await expect(pong.canvas.getNodeIssuesByName('OpenAI Chat Model')).toHaveCount(0);
		});
	},
);
