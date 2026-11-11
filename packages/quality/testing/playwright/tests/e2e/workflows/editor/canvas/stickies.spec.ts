import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Canvas Actions',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test('adds sticky to canvas with default text and position', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await expect(pong.canvas.sticky.getAddButton()).toBeVisible();

			await pong.canvas.sticky.addSticky();

			const firstSticky = pong.canvas.sticky.getStickies().first();
			await expect(firstSticky).toHaveCSS('height', '160px');
			await expect(firstSticky).toHaveCSS('width', '240px');

			await pong.canvas.deselectAll();
			await pong.canvas.sticky.addFromContextMenu(pong.canvas.canvasPane());
			await pong.page.keyboard.press('Shift+s');

			await expect(pong.canvas.sticky.getStickies()).toHaveCount(3);

			await pong.page.keyboard.press('ControlOrMeta+Shift+s');
			await expect(pong.canvas.sticky.getStickies()).toHaveCount(3);

			await expect(pong.canvas.sticky.getStickies().first()).toHaveText(
				'I’m a note\nDouble click to edit me. Guide\n',
			);
			const guideLink = pong.canvas.sticky.getDefaultStickyGuideLink();
			await expect(guideLink).toHaveAttribute('href');
		});

		test('opens the color picker from the right-click context menu', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.sticky.addSticky();

			const sticky = pong.canvas.sticky.getStickies().first();
			await pong.canvas.sticky.openColorPickerFromContextMenu(sticky);

			// The popover is opened as the context menu closes; it must survive the
			// menu's focus restoration rather than being dismissed immediately.
			await expect(pong.canvas.sticky.getColorOptions().first()).toBeVisible();
		});
	},
);
