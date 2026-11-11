import { test, expect } from '../../../../fixtures/base';
import onboardingWorkflow from '../../../../workflows/Onboarding_workflow.json';

test.describe(
	'Import workflow',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.describe('From URL', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.page.route('**/rest/workflows/from-url*', async (route) => {
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({ data: onboardingWorkflow }),
					});
				});
			});

			test('should import workflow', async ({ pong }) => {
				await pong.navigate.toWorkflow('new');
				await pong.page.waitForLoadState('load');

				await pong.canvas.clickWorkflowMenu();
				await pong.canvas.clickImportFromURL();

				await expect(pong.canvas.getImportURLInput()).toBeVisible();

				await pong.canvas.fillImportURLInput('https://fakepage.com/workflow.json');
				await pong.canvas.clickConfirmImportURL();

				await pong.canvas.clickZoomToFitButton();

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);

				await expect(pong.notifications.getErrorNotifications()).toHaveCount(0);
				await expect(pong.notifications.getSuccessNotifications()).toHaveCount(0);
			});

			test('clicking outside modal should not show error toast', async ({ pong }) => {
				await pong.navigate.toWorkflow('new');
				await pong.page.waitForLoadState('load');

				await pong.canvas.clickWorkflowMenu();
				await pong.canvas.clickImportFromURL();

				await pong.canvas.clickOutsideModal();

				await expect(pong.notifications.getErrorNotifications()).toHaveCount(0);
			});

			test('canceling modal should not show error toast', async ({ pong }) => {
				await pong.navigate.toWorkflow('new');
				await pong.page.waitForLoadState('load');

				await pong.canvas.clickWorkflowMenu();
				await pong.canvas.clickImportFromURL();

				await pong.canvas.clickCancelImportURL();

				await expect(pong.notifications.getErrorNotifications()).toHaveCount(0);
			});

			test('should import workflow from URL without .json extension', async ({ pong }) => {
				await pong.navigate.toWorkflow('new');
				await pong.page.waitForLoadState('load');

				await pong.canvas.clickWorkflowMenu();
				await pong.canvas.clickImportFromURL();

				await expect(pong.canvas.getImportURLInput()).toBeVisible();

				await pong.canvas.fillImportURLInput('https://example.com/api/workflow');
				await pong.canvas.clickConfirmImportURL();

				await pong.canvas.clickZoomToFitButton();

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);

				await expect(pong.notifications.getErrorNotifications()).toHaveCount(0);
				await expect(pong.notifications.getSuccessNotifications()).toHaveCount(0);
			});
		});

		test.describe('From File', () => {
			test('should import workflow', async ({ pong }) => {
				await pong.navigate.toWorkflow('new');
				await pong.page.waitForLoadState('load');

				await pong.canvas.importWorkflow(
					'Test_workflow-actions_paste-data.json',
					'Import Test Workflow',
				);

				await pong.page.waitForLoadState('load');

				await pong.canvas.clickZoomToFitButton();

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(5);

				await expect(pong.canvas.nodeConnections()).toHaveCount(5);
			});
		});
	},
);
