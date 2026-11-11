import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';
import simpleWorkflow from '../../../workflows/Manual_wait_set.json';
import workflowWithPinned from '../../../workflows/Webhook_set_pinned.json';

const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

test.describe(
	'Demo',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		test('can import template', async ({ pong }) => {
			await pong.demo.goto();
			expect(await pong.notifications.getAllNotificationTexts()).toHaveLength(0);
			await pong.demo.importWorkflow(simpleWorkflow);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
		});

		test('can import workflow with pin data', async ({ pong }) => {
			await pong.demo.goto();
			await expect(pong.canvas.canvasPane()).toBeVisible();
			await pong.demo.importWorkflow(workflowWithPinned);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await pong.canvas.openNode('Webhook');
			await expect(pong.ndv.outputPanel.getTableHeaders().first()).toContainText('headers');
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 3)).toContainText('dragons');
		});

		test('can override theme to dark', async ({ pong }) => {
			await pong.demo.goto({ theme: 'dark' });
			await expect(pong.demo.getBody()).toHaveAttribute('data-theme', 'dark');
			expect(await pong.notifications.getAllNotificationTexts()).toHaveLength(0);
		});

		test('can override theme to light', async ({ pong }) => {
			await pong.demo.goto({ theme: 'light' });
			await expect(pong.demo.getBody()).toHaveAttribute('data-theme', 'light');
			expect(await pong.notifications.getAllNotificationTexts()).toHaveLength(0);
		});
	},
);
