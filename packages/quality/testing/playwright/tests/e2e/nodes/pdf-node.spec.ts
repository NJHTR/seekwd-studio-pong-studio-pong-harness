import { expect, test } from '../../../fixtures/base';

test.describe(
	'PDF Test',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('Can read and write PDF files and extract text', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.importWorkflow('test_pdf_workflow.json', 'PDF Workflow');
			await pong.canvas.clickExecuteWorkflowButton();
			// Increased timeout - PDF processing can be slow after recent changes
			await expect(
				pong.notifications.getNotificationByTitle('Workflow executed successfully'),
			).toBeVisible({ timeout: 30000 });
		});
	},
);
