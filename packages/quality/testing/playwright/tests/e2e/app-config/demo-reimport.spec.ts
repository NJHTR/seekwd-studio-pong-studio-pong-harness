import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';
import simpleWorkflow from '../../../workflows/Manual_wait_set.json';
import chainWorkflow from '../../../workflows/Simple_chain_4nodes.json';

test.describe(
	'Demo reimport',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		const previewRequirements: TestRequirements = {
			config: { settings: { previewMode: true } },
		};

		test.describe('Workflow reimport — connections and layout', () => {
			test.beforeEach(async ({ setupRequirements }) => {
				await setupRequirements(previewRequirements);
			});

			test('should preserve connections when same workflow is reimported', async ({ pong }) => {
				await pong.demo.goto();
				await pong.demo.importWorkflow(simpleWorkflow);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
				await expect(pong.canvas.nodeConnections()).toHaveCount(2);

				// Reimport the same workflow
				await pong.demo.importWorkflow(simpleWorkflow);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
				await expect(pong.canvas.nodeConnections()).toHaveCount(2);
			});

			test('should show correct connections when switching to a different workflow', async ({
				pong,
			}) => {
				await pong.demo.goto();

				// Import 3-node workflow (2 connections)
				await pong.demo.importWorkflow(simpleWorkflow);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
				await expect(pong.canvas.nodeConnections()).toHaveCount(2);

				// Switch to 4-node workflow (3 connections)
				await pong.demo.importWorkflow(chainWorkflow);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
				await expect(pong.canvas.nodeConnections()).toHaveCount(3);
			});

			test('should show all nodes in viewport after reimport (fitView)', async ({ pong }) => {
				await pong.demo.goto();
				await pong.demo.importWorkflow(simpleWorkflow);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);

				// Reimport larger workflow
				await pong.demo.importWorkflow(chainWorkflow);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);

				// All nodes should be visible (fitView should have run)
				for (const name of ['Manual', 'Set', 'Wait', 'Set1']) {
					await expect(pong.canvas.nodeByName(name)).toBeVisible();
				}
			});
		});
	},
);
