import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	workflow: 'manual-trigger-with-code.json',
	storage: {
		PONG_EXPERIMENT_OVERRIDES: JSON.stringify({ ndv_in_focus_panel: 'variant' }),
	},
};

test.describe(
	'SUG-121 Fields reset after closing NDV',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should preserve changes to parameters after closing NDV when focus panel is open', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.toggleFocusPanelButton().click();
			await pong.canvas.canvasPane().click();
			await pong.canvas.nodeByName('Code').dblclick();
			await pong.ndv.getParameterTextboxByLabel('JavaScript').fill('alert(1)');
			await pong.ndv.close();
			await pong.canvas.nodeByName('Code').dblclick();
			await expect(pong.ndv.getParameterTextboxByLabel('JavaScript')).toHaveText('alert(1)');
		});
	},
);
