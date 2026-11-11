import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Executions Filter',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');

			// Create mix of successful and failed executions
			await pong.executionsComposer.createExecutions(2);
			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);
			await pong.executionsComposer.createExecutions(2);

			const executionsResponsePromise = pong.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);
			await pong.canvas.clickExecutionsTab();
			await executionsResponsePromise;

			await expect(pong.executions.getExecutionItems().first()).toBeVisible();
		});

		test('should filter executions by status and show filter badge', async ({ pong }) => {
			await pong.executions.openFilter();
			await expect(pong.executions.getFilterForm()).toBeVisible();

			// No badge before filtering
			await expect(pong.executions.getFilterBadge()).toBeHidden();

			const filterRequestPromise = pong.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/executions?filter=') && response.url().includes('error'),
			);

			await pong.executions.selectFilterStatus('Error');
			await filterRequestPromise;

			// Badge shows active filter count
			await expect(pong.executions.getFilterBadge()).toBeVisible();

			// Only failed executions visible
			await expect(pong.executions.getFailedExecutionItems()).toHaveCount(2);
			await expect(pong.executions.getSuccessfulExecutionItems()).toHaveCount(0);
		});

		test('should reset filter and remove badge', async ({ pong }) => {
			await pong.executions.openFilter();
			await expect(pong.executions.getFilterForm()).toBeVisible();

			const filterRequestPromise = pong.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/executions?filter=') && response.url().includes('success'),
			);

			await pong.executions.selectFilterStatus('Success');
			await filterRequestPromise;

			await expect(pong.executions.getFilterBadge()).toBeVisible();
			await expect(pong.executions.getFilterResetButton()).toBeVisible();

			const resetRequestPromise = pong.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/executions?filter=') &&
					!response.url().includes('success'),
			);

			await pong.executions.resetFilter();
			await resetRequestPromise;

			await expect(pong.executions.getFilterBadge()).toBeHidden();
			await expect(pong.executions.getExecutionItems()).toHaveCount(4);
		});
	},
);
