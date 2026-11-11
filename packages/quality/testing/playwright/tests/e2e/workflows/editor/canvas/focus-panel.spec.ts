import { test, expect } from '../../../../../fixtures/base';
import type { TestRequirements } from '../../../../../Types';

test.describe(
	'Focus panel',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.describe('With experimental NDV in focus panel enabled', () => {
			const requirements: TestRequirements = {
				storage: {
					PONG_EXPERIMENT_OVERRIDES: JSON.stringify({ ndv_in_focus_panel: 'variant' }),
				},
			};

			test('should keep showing selected node when canvas is clicked while mapper popover is shown', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(requirements);
				await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
				await pong.canvas.clickZoomToFitButton();
				await pong.canvas.deselectAll();
				await pong.canvas.toggleFocusPanelButton().click();
				await pong.canvas.nodeByName('Set').click();
				await expect(pong.canvas.focusPanel.getHeaderNodeName()).toHaveText('Set');
				await pong.canvas.focusPanel
					.getParameterInputField('assignments.assignments.0.value')
					.focus();
				await expect(pong.canvas.focusPanel.getMapper()).toBeVisible();

				// Assert that mapper is closed but the Set node is still selected and shown in
				await pong.canvas.canvasBody().click({ position: { x: 1, y: 1 } });

				await expect(pong.canvas.focusPanel.getMapper()).toBeHidden();
				await expect(pong.canvas.focusPanel.getHeaderNodeName()).toHaveText('Set');
				await expect(pong.canvas.selectedNodes()).toHaveCount(1);

				// Assert that another click on canvas does de-select the Set node
				await pong.canvas.canvasBody().click({ position: { x: 1, y: 1 } });

				await expect(pong.canvas.focusPanel.getHeaderNodeName()).toBeHidden();
				await expect(pong.canvas.selectedNodes()).toHaveCount(0);
			});
		});
	},
);
