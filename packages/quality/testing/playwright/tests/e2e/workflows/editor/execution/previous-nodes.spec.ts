import { test, expect } from '../../../../../fixtures/base';

// Flaky in multi-main mode: "execute previous nodes" also executes the current node
test.describe(
	'Execute previous nodes',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.fixme();

		test('should execute only previous nodes and not the current node', async ({ pong }) => {
			// Import workflow with Manual Trigger -> Code1 -> Code2
			await pong.start.fromImportedWorkflow('execute-previous-nodes.json');

			// Open the second Code node (Code2)
			await pong.canvas.openNode('Code2');

			// Click "Execute previous nodes" - this should execute Manual Trigger and Code1, but NOT Code2
			await pong.ndv.executePrevious();

			// Wait for execution to complete by checking that input panel has data
			await expect(pong.ndv.inputPanel.getDataContainer()).toBeVisible({ timeout: 15000 });

			// Verify that the input panel has data from Code1 (which was executed)
			await expect(pong.ndv.inputPanel.get()).toContainText('myNewField');

			// Verify Code2 (current node) was NOT executed.
			// The output panel should show the placeholder text, not execution results
			await expect(pong.ndv.outputPanel.get()).toContainText('Execute step or set mock data');

			// Close the NDV
			await pong.ndv.close();

			// Open Code1 to verify it WAS executed
			await pong.canvas.openNode('Code1');

			// Verify Code1 has execution success indicator and output data
			await expect(pong.ndv.getNodeRunSuccessIndicator()).toBeVisible();
			await expect(pong.ndv.outputPanel.getItemsCount()).toBeVisible();

			// Close and verify Manual Trigger was also executed
			await pong.ndv.close();
			await pong.canvas.openNode('Manual Trigger');
			await expect(pong.ndv.getNodeRunSuccessIndicator()).toBeVisible();
		});
	},
);
