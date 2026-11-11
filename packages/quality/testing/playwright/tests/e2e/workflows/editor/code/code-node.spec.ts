import {
	CODE_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Code node',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.describe('Code editor', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
			});

			test('should show correct placeholders switching modes', async ({ pong }) => {
				await expect(
					pong.ndv.getPlaceholderText('// Loop over input items and add a new field'),
				).toBeVisible();

				await pong.ndv.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

				await expect(
					pong.ndv.getPlaceholderText("// Add a new field called 'myNewField'"),
				).toBeVisible();

				await pong.ndv.selectOptionInParameterDropdown('mode', 'Run Once for All Items');

				await expect(
					pong.ndv.getPlaceholderText('// Loop over input items and add a new field'),
				).toBeVisible();
			});

			test('should execute the placeholder successfully in both modes', async ({ pong }) => {
				await pong.ndv.execute();

				await expect(
					pong.notifications.getNotificationByTitle('Node executed successfully').first(),
				).toBeVisible();

				await pong.ndv.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

				await pong.ndv.execute();

				await expect(
					pong.notifications.getNotificationByTitle('Node executed successfully').first(),
				).toBeVisible();
			});

			test('should allow switching between sibling code nodes', async ({ pong }) => {
				await pong.ndv.getCodeEditor().fill("console.log('Code in JavaScript1')");
				await pong.ndv.close();

				await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });

				await pong.ndv.getCodeEditor().fill("console.log('Code in JavaScript2')");
				await pong.ndv.close();

				await pong.canvas.openNode(CODE_NODE_DISPLAY_NAME);

				await pong.ndv.clickFloatingNode(CODE_NODE_DISPLAY_NAME + '1');
				await expect(pong.ndv.getCodeEditor()).toContainText("console.log('Code in JavaScript2')");

				await pong.ndv.clickFloatingNode(CODE_NODE_DISPLAY_NAME);
				await expect(pong.ndv.getCodeEditor()).toContainText("console.log('Code in JavaScript1')");
			});

			test('should show lint errors in `runOnceForAllItems` mode', async ({ pong }) => {
				await pong.ndv.getCodeEditor().fill(`$input.itemMatching()
$input.item
$('When clicking ‘Execute workflow’').item
$input.first(1)

for (const item of $input.all()) {
  item.foo
}

return
`);
				await expect(pong.ndv.getLintErrors()).toHaveCount(6);
				const firstLintError = pong.ndv.getLintErrors().first();
				await expect(firstLintError).toBeVisible();
				await firstLintError.hover({ force: true });

				// Wait for lint tooltip to appear after hover
				await expect(pong.ndv.getLintTooltip()).toBeVisible({ timeout: 5000 });
				await expect(pong.ndv.getLintTooltip()).toContainText(
					'`.itemMatching()` expects an item index to be passed in as its argument.',
				);
			});
		});

		test.describe
			.serial('Run Once for Each Item', () => {
				test('should show lint errors in `runOnceForEachItem` mode', async ({ pong }) => {
					await pong.start.fromBlankCanvas();
					await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
					await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
					await pong.ndv.toggleCodeMode('Run Once for Each Item');

					await pong.ndv.getCodeEditor().fill(`$input.itemMatching()
$input.all()
$input.first()
$input.item()

return []
`);
					// Verify lint errors are detected (tooltip hover tested in runOnceForAllItems test)
					await expect(pong.ndv.getLintErrors()).toHaveCount(7);
				});
			});
	},
);
