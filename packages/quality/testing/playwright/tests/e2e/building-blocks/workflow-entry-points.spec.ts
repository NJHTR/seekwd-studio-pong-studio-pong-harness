import { EDIT_FIELDS_SET_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'UI Test Entry Points',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.describe('Entry Point: Home Page', () => {
			test('should navigate from home', async ({ pong }) => {
				await pong.start.fromHome();
				expect(pong.page.url()).toContain('/home/workflows');
			});
		});

		test.describe('Entry Point: Blank Canvas', () => {
			test('should navigate from blank canvas', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await expect(pong.canvas.canvasPane()).toBeVisible();
			});

			// Parity sentinel: the editor saves this workflow, so only the `pong`
			// fixture's settings merge sends it to engine v2. The explicit check keeps
			// this test red if that wiring is lost.
			test('should run a workflow built on the canvas @engine:v2', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await pong.api.workflows.assertLatestExecutionRoutedToEngine(
					pong.canvas.getWorkflowIdFromUrl(),
				);
			});
		});

		test.describe('Entry Point: Basic Workflow Creation', () => {
			test('should create a new project and workflow', async ({ pong }) => {
				await pong.start.fromNewProjectBlankCanvas();
				await expect(pong.canvas.canvasPane()).toBeVisible();
			});
		});

		test.describe('Entry Point: Imported Workflow', () => {
			test('should import a webhook workflow @engine:v2', async ({ pong, api }) => {
				const workflowImportResult = await pong.start.fromImportedWorkflow(
					'simple-webhook-test.json',
				);
				const { webhookPath } = workflowImportResult;

				const testPayload = { message: 'Hello from Playwright test' };

				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

				const webhookResponse = await api.webhooks.trigger(`/webhook-test/${webhookPath}`, {
					method: 'POST',
					data: testPayload,
				});

				expect(webhookResponse.ok()).toBe(true);
			});

			test('should import a workflow', async ({ pong }) => {
				await pong.start.fromImportedWorkflow('manual.json');
				await pong.workflowComposer.executeWorkflowAndWaitForNotification('Success');
				await expect(pong.canvas.canvasPane()).toBeVisible();
			});
		});
	},
);
