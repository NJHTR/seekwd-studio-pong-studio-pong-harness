import { test, expect } from '../../../fixtures/base';

test.describe(
	'HTTP Request node',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should make a request with a URL and receive a response', async ({ pong }) => {
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('HTTP Request', { closeNDV: false });

			await pong.ndv.setupHelper.httpRequest({
				url: 'https://catfact.ninja/fact',
			});
			await pong.ndv.execute();

			await expect(pong.ndv.outputPanel.get()).toContainText('fact');
		});

		test.describe('Credential-only HTTP Request Node variants', () => {
			test('should render a modified HTTP Request Node', async ({ pong }) => {
				await pong.canvas.addNode('Manual Trigger');
				await pong.canvas.addNode('VirusTotal');

				await expect(pong.ndv.getNodeNameContainer()).toContainText('VirusTotal HTTP Request');
				await expect(pong.ndv.getParameterInputField('url')).toHaveValue(
					'https://www.virustotal.com/api/v3/',
				);

				await expect(pong.ndv.getParameterInput('authentication')).toBeHidden();
				await expect(pong.ndv.getParameterInput('nodeCredentialType')).toBeHidden();

				await expect(pong.ndv.getCredentialLabel('Credential for VirusTotal')).toBeVisible();
			});
		});
	},
);
