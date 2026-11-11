import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI artifacts',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('should display artifact card in timeline after workflow build', async ({ pong }) => {
			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact display test"',
			);

			await expect(pong.instanceAi.getPreviewTabByName(/artifact display test/i)).toBeVisible({
				timeout: 120_000,
			});
			await expect(pong.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
			await pong.instanceAi.waitForResponseComplete();
		});

		test('should open workflow preview when clicking artifact card', async ({ pong }) => {
			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact click test"',
			);

			await pong.instanceAi.waitForResponseComplete(120_000);

			// Preview should auto-open after build
			await expect(pong.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
			await pong.instanceAi.waitForResponseComplete();

			// Hide the preview first
			await pong.instanceAi.getPreviewToggleButton().click();
			await expect(pong.instanceAi.getPreviewIframeLocator()).toBeHidden();

			// Click the artifact entry to re-open the preview
			await pong.instanceAi.getArtifactPanelLinkByName(/Open artifact click test/i).click();

			// Preview should open again with canvas nodes
			await expect(pong.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
		});
	},
);
