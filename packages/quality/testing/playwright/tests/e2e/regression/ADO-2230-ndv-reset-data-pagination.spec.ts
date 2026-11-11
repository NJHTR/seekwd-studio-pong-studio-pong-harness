import { test, expect } from '../../../fixtures/base';

test.describe(
	'ADO-2230 NDV Pagination Reset',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should reset pagination if data size changes to less than current page', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow('NDV-debug-generate-data.json');

			await pong.canvas.openNode('DebugHelper');
			await pong.ndv.execute();
			await pong.notifications.quickCloseAll();

			const outputPagination = pong.ndv.getOutputPagination();
			await expect(outputPagination).toBeVisible();

			await expect(pong.ndv.getOutputPaginationPages()).toHaveCount(5);

			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).not.toBeEmpty();
			const firstPageContent = await pong.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			await pong.ndv.navigateToOutputPage(4);

			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).not.toHaveText(firstPageContent ?? '');

			await pong.ndv.setParameterInputValue('randomDataCount', '50');

			await pong.ndv.execute();
			await pong.notifications.quickCloseAll();

			await expect(pong.ndv.getOutputPaginationPages()).toHaveCount(2);

			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).not.toBeEmpty();
		});
	},
);
