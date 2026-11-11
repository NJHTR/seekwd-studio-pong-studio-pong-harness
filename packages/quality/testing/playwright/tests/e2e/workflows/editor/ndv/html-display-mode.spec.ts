import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV HTML display mode',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			// A Code node creates 30 items, more than one page, and the HTML node renders one heading for each
			await pong.start.fromImportedWorkflow('Test_workflow_html_display_mode.json');
			await pong.canvas.clickExecuteWorkflowButton();
			await pong.canvas.openNode('HTML');
		});

		test('should select the HTML display mode and show the first item', async ({ pong }) => {
			const { outputPanel } = pong.ndv;

			await expect(outputPanel.getDisplayModeOption('html')).toHaveText('HTML');
			await expect(outputPanel.getActiveDisplayMode()).toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);
			await expect(outputPanel.getHtmlPreviewHeading('Item 1')).toBeVisible();
			// The HTML view shows only the first item
			await expect(outputPanel.getHtmlPreviewHeadings()).toHaveCount(1);
			// 30 items are more than one page, but pages have no effect on the HTML view
			await expect(outputPanel.getPagination()).toBeHidden();
		});

		test('should show the HTML of the item that matches the search', async ({ pong }) => {
			const { outputPanel } = pong.ndv;

			// Item 27 is on page 2, so this also checks that search covers every item, not only the visible page
			await pong.ndv.searchOutputData('Item 27');

			await expect(outputPanel.getActiveDisplayMode()).toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);
			await expect(outputPanel.getHtmlPreviewHeading('Item 27')).toBeVisible();
			// The HTML view shows only the first item
			await expect(outputPanel.getHtmlPreviewHeadings()).toHaveCount(1);
		});

		test('should fall back to a built-in display mode on a node that does not generate HTML', async ({
			pong,
		}) => {
			const { outputPanel } = pong.ndv;
			await expect(outputPanel.getActiveDisplayMode()).toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);

			await pong.ndv.clickBackToCanvasButton();
			await pong.canvas.openNode('Create items');

			await expect(outputPanel.getDisplayModeOption('html')).toHaveCount(0);
			await expect(outputPanel.getActiveDisplayMode()).toBeVisible();
			await expect(outputPanel.getActiveDisplayMode()).not.toHaveAttribute(
				'data-test-id',
				'radio-button-html',
			);
			// Every built-in mode shows the field name, so this fails for a blank panel
			await expect(outputPanel.getItemsCountText('30 items')).toBeVisible();
			await expect(outputPanel.getDataContainer()).toContainText('name');
			await expect(outputPanel.getNodeErrorMessageHeader()).toBeHidden();
		});
	},
);
