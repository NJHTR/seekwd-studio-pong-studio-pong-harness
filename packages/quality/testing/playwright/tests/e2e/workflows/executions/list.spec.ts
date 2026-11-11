import flatted from 'flatted';

import { test, expect } from '../../../../fixtures/base';
import executionOutOfMemoryResponse from '../../../../fixtures/execution-out-of-memory-server-response.json';

test.describe(
	'Executions Filter',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		// There is flakiness in this test. When the dropdown is opened, at times it appears to automatically close even without user interaction.
		// Manual timeouts have been added to try to mitigate this, but it still happens.
		test.fixme(
			'should keep popover open when selecting from dropdown inside it',
			async ({ pong }) => {
				// Regression test: Element Plus dropdowns are teleported to body, causing
				// Reka UI's DismissableLayer to detect clicks as "outside" and close the popover.
				// This test verifies the popover stays open during and after dropdown selection.

				// Create some executions first
				await pong.executionsComposer.createExecutions(2);

				// Go to executions tab
				await pong.canvas.clickExecutionsTab();
				await expect(pong.executions.getExecutionItems().first()).toBeVisible();

				// Open filter popover
				await pong.executions.openFilter();
				const filterForm = pong.executions.getFilterForm();
				await pong.page.waitForTimeout(1500);
				await expect(filterForm).toBeVisible();

				// Click to open the status dropdown
				await pong.executions.getStatusSelect().click();
				// Verify popover is still open while dropdown is open
				await expect(filterForm).toBeVisible();

				// Set up listener for the filtered executions request
				const filterRequestPromise = pong.page.waitForRequest(
					(request) =>
						request.url().includes('/rest/executions?filter=') && request.url().includes('success'),
				);

				await pong.page.waitForTimeout(500);
				// Select an option from the dropdown
				await pong.executions.getStatusOption('Success').click();

				// Verify the filter request was sent to the backend (confirms selection worked)
				const filterRequest = await filterRequestPromise;
				expect(filterRequest.url()).toContain('status');
				expect(filterRequest.url()).toContain('success');

				// KEY ASSERTION: Verify the popover did NOT close after selecting from dropdown
				await expect(filterForm).toBeVisible();
			},
		);
	},
);

const ERROR_MESSAGES = {
	OUT_OF_MEMORY: 'Workflow did not finish, possible out-of-memory issue',
} as const;

const TIMEOUTS = {
	EXECUTIONS_REFRESH_INTERVAL: 4000,
} as const;

test.describe('Workflow Executions', () => {
	test.describe('when workflow is saved', () => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		test('should render executions tab correctly', async ({ pong }) => {
			await pong.executionsComposer.createExecutions(15);

			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);
			await pong.executionsComposer.createExecutions(2);

			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);
			await pong.executionsComposer.createExecutions(15);

			const executionsResponsePromise = pong.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);

			await pong.canvas.clickExecutionsTab();
			await executionsResponsePromise;

			await expect(pong.executions.getExecutionItems().first()).toBeVisible();

			const loadMoreResponsePromise = pong.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);
			await pong.executions.scrollExecutionsListToBottom();
			await loadMoreResponsePromise;

			await expect(pong.executions.getExecutionItems()).toHaveCount(30, { timeout: 15000 });
			await expect(pong.executions.getSuccessfulExecutionItems()).toHaveCount(28);
			await expect(pong.executions.getFailedExecutionItems()).toHaveCount(2);
			await expect(pong.executions.getFirstExecutionItem()).toHaveClass(/_active_/);
		});

		test('should open command bar with keyboard shortcut on executions view', async ({ pong }) => {
			await pong.executionsComposer.createExecutions(1);

			await pong.canvas.clickExecutionsTab();
			await expect(pong.executions.getPreview()).toBeVisible();

			await pong.commandBar.openWithShortcut();
			await expect(pong.commandBar.getItem('Delete this execution')).toBeVisible();
		});

		test('should not redirect back to execution tab when request is not done before leaving the page', async ({
			pong,
		}) => {
			await pong.page.route('**/rest/executions?filter=*', (route) => route.continue());
			await pong.page.route('**/rest/executions/active?filter=*', (route) => route.continue());

			await pong.canvas.clickExecutionsTab();
			await pong.canvas.clickEditorTab();
			await expect(pong.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});

			for (let i = 0; i < 3; i++) {
				await pong.canvas.clickExecutionsTab();
				await pong.canvas.clickEditorTab();
			}
			await expect(pong.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});

			await pong.canvas.clickExecutionsTab();
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await pong.page.waitForTimeout(1000);
			await pong.canvas.clickEditorTab();
			await expect(pong.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});
		});

		test('should not redirect back to execution tab when slow request is not done before leaving the page', async ({
			pong,
		}) => {
			await pong.page.route('**/rest/executions?filter=*', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				await route.continue();
			});

			await pong.page.route('**/rest/executions/active?filter=*', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				await route.continue();
			});

			await pong.canvas.clickExecutionsTab();
			await pong.page.waitForURL(/\/executions/);
			await pong.canvas.clickEditorTab();
			await pong.page.waitForURL(/\/workflow\/[^/]+$/);

			await expect(pong.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});
		});

		test('should error toast when server error message returned without stack trace', async ({
			pong,
		}) => {
			const responsePromise = pong.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/workflows/') &&
					response.url().includes('/run') &&
					response.request().method() === 'POST',
			);
			await pong.canvas.clickExecuteWorkflowButton();
			await responsePromise;

			await pong.page.route('**/rest/executions/*', async (route) => {
				if (route.request().url().includes('?filter=')) {
					await route.continue();
					return;
				}

				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(executionOutOfMemoryResponse),
				});
			});

			const executionDetailPromise = pong.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/executions/') && !response.url().includes('?filter='),
			);
			await pong.canvas.clickExecutionsTab();
			await executionDetailPromise;

			await expect(pong.executions.getPreview()).toBeVisible();

			await pong.executions.getErrorNotificationsInPreview().first().waitFor({ timeout: 5000 });

			const errorNotification = pong.executions
				.getErrorNotificationsInPreview()
				.filter({ hasText: ERROR_MESSAGES.OUT_OF_MEMORY });
			await expect(errorNotification.first()).toBeVisible();
		});

		test.fixme(
			'should show workflow data in executions tab after hard reload and modify name and tags',
			async () => {
				// TODO: Migrate from Cypress
			},
		);
		test.fixme('should load items and auto scroll after filter change', async () => {
			// TODO: This should be a component test
		});

		test('should redirect back to editor after seeing a couple of execution using browser back button', async ({
			pong,
		}) => {
			await pong.executionsComposer.createExecutions(15);

			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(0);
			await pong.executionsComposer.createExecutions(2);

			await pong.canvas.toggleNodeEnabled('Error');
			await expect(pong.canvas.disabledNodes()).toHaveCount(1);
			await pong.executionsComposer.createExecutions(15);

			const executionsResponsePromise = pong.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);

			await pong.canvas.clickExecutionsTab();
			await executionsResponsePromise;

			const preview = pong.executions.getPreview();
			await expect(preview).toBeAttached();

			await pong.executions.getExecutionItems().nth(2).click();
			await expect(preview).toBeAttached();

			await pong.executions.getExecutionItems().nth(4).click();
			await expect(preview).toBeAttached();

			await pong.executions.getExecutionItems().nth(6).click();
			await expect(preview).toBeAttached();

			await pong.page.goBack();
			await expect(preview).toBeAttached();

			await pong.page.goBack();
			await expect(preview).toBeAttached();

			await pong.page.goBack();
			await expect(preview).toBeAttached();

			await pong.page.goBack();

			await expect(pong.page).not.toHaveURL(/\/executions/);
			await expect(pong.page).toHaveURL(/\/workflow\//);
			await expect(pong.canvas.canvasPane()).toBeVisible();
		});
	});

	test.describe('execution timing', () => {
		test('should preserve execution start time for standard workflow @engine:v2', async ({
			api,
		}) => {
			const { webhookPath, workflowId, createdWorkflow } =
				await api.workflows.importWorkflowFromFile('simple-webhook-test.json');

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: {},
			});
			expect(webhookResponse.ok()).toBe(true);

			const execution = await api.workflows.waitForExecution(workflowId, 10000);
			const originalStartedAt = execution.startedAt;

			const finalExecution = await api.workflows.getExecution(execution.id);
			expect(finalExecution.startedAt).toBe(originalStartedAt);
		});

		test('should preserve execution start time after resuming from wait node', async ({ api }) => {
			const { webhookPath, workflowId, createdWorkflow } =
				await api.workflows.importWorkflowFromFile('cat-1854-wait-execution-history.json');

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);
			expect(webhookResponse.ok()).toBe(true);

			const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);
			const originalStartedAt = execution.startedAt;

			const fullExecution = await api.workflows.getExecution(execution.id);
			const executionData = flatted.parse(fullExecution.data);
			const resumeUrl = new URL(
				executionData.resultData.runData['Capture Resume URL'][0].data.main[0][0].json
					.resumeUrl as string,
			);

			const resumeResponse = await api.webhooks.trigger(`${resumeUrl.pathname}${resumeUrl.search}`);
			expect(resumeResponse.ok()).toBe(true);

			await api.workflows.waitForExecution(workflowId, 15000);

			await expect(async () => {
				const completedExecution = await api.workflows.getExecution(execution.id);
				expect(completedExecution.startedAt).toBe(originalStartedAt);
			}).toPass();
		});
	});

	test.describe('when new workflow is not saved', () => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should open executions tab', async ({ pong }) => {
			await pong.canvas.clickExecutionsTab();
			await expect(pong.executions.getExecutionsSidebar()).toBeVisible();
			await expect(pong.executions.getExecutionsEmptyList()).toBeVisible();
			await expect(pong.executions.getNoTriggerContent()).toBeVisible();

			await pong.executions.getAddFirstStepButton().click();
			await pong.canvas.nodeCreatorItemByName('Trigger manually').click();

			await pong.canvas.clickExecutionsTab();
			await expect(pong.executions.getExecutionsSidebar()).toBeVisible();
			await expect(pong.executions.getExecutionsEmptyList()).toBeVisible();
			await expect(pong.executions.getNoContent()).toBeVisible();

			await pong.canvas.waitForSaveWorkflowCompleted();
			await pong.page.waitForURL(/\/workflow\/.+\/executions$/);
		});
	});
});
