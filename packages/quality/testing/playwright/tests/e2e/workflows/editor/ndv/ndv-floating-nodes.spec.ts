import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV Floating Nodes Navigation',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should traverse floating nodes with mouse', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Floating_Nodes.json');
			await pong.canvas.getCanvasNodes().first().dblclick();
			await expect(pong.ndv.container).toBeVisible();

			await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(pong.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
			for (let i = 0; i < 4; i++) {
				await pong.ndv.clickFloatingNodeByPosition('outputMain');
				await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
				await expect(pong.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();

				await pong.ndv.close();
				await expect(pong.canvas.getSelectedNodes()).toHaveCount(1);

				await pong.canvas.getSelectedNodes().first().dblclick();
				await expect(pong.ndv.container).toBeVisible();
			}

			await pong.ndv.clickFloatingNodeByPosition('outputMain');
			await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();

			for (let i = 0; i < 4; i++) {
				await pong.ndv.clickFloatingNodeByPosition('inputMain');
				await expect(pong.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
				await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
			}

			await pong.ndv.clickFloatingNodeByPosition('inputMain');
			await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(pong.ndv.getFloatingNodeByPosition('inputSub')).toBeHidden();
			await expect(pong.ndv.getFloatingNodeByPosition('outputSub')).toBeHidden();

			await pong.ndv.close();
			await expect(pong.canvas.getSelectedNodes()).toHaveCount(1);
		});

		test('should traverse floating nodes with keyboard', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Floating_Nodes.json');

			await pong.canvas.getCanvasNodes().first().dblclick();
			await expect(pong.ndv.container).toBeVisible();

			await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(pong.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
			for (let i = 0; i < 4; i++) {
				await pong.ndv.navigateToNextFloatingNodeWithKeyboard();
				await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
				await expect(pong.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();

				await pong.ndv.close();
				await expect(pong.canvas.getSelectedNodes()).toHaveCount(1);

				await pong.canvas.getSelectedNodes().first().dblclick();
				await expect(pong.ndv.container).toBeVisible();
			}

			await pong.ndv.navigateToNextFloatingNodeWithKeyboard();
			await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();

			for (let i = 0; i < 4; i++) {
				await pong.ndv.navigateToPreviousFloatingNodeWithKeyboard();
				await expect(pong.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
				await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
			}

			await pong.ndv.navigateToPreviousFloatingNodeWithKeyboard();
			await expect(pong.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(pong.ndv.getFloatingNodeByPosition('inputSub')).toBeHidden();
			await expect(pong.ndv.getFloatingNodeByPosition('outputSub')).toBeHidden();

			await pong.ndv.close();
			await expect(pong.canvas.getSelectedNodes()).toHaveCount(1);
		});

		test('should connect floating sub-nodes', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('AI Agent', { closeNDV: false });
			await expect(pong.ndv.container).toBeVisible();

			await pong.ndv.connectAISubNode('ai_languageModel', 'Anthropic Chat Model');
			await pong.ndv.connectAISubNode('ai_memory', 'Redis Chat Memory');
			await pong.ndv.connectAISubNode('ai_tool', 'HTTP Request Tool');

			await expect(pong.ndv.getNodesWithIssues()).toHaveCount(3);
		});

		test('should have the floating nodes in correct order', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Floating_Nodes.json');

			await pong.canvas.openNode('Merge');
			await expect(pong.ndv.container).toBeVisible();

			expect(await pong.ndv.getFloatingNodeCount('inputMain')).toBe(2);
			await pong.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields1', 0);
			await pong.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields0', 1);

			await pong.ndv.close();

			await pong.canvas.openNode('Merge1');
			await expect(pong.ndv.container).toBeVisible();

			expect(await pong.ndv.getFloatingNodeCount('inputMain')).toBe(2);
			await pong.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields0', 0);
			await pong.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields1', 1);
		});
	},
);
