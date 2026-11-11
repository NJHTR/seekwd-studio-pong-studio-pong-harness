import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Workflow Settings',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.fixme();

		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should update workflow settings', async ({ pong }) => {
			await pong.navigate.toHome();

			const workflowsResponsePromise = pong.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/workflows') && response.request().method() === 'GET',
			);

			await pong.sideBar.addWorkflowFromUniversalAdd('Personal');

			const workflowsResponse = await workflowsResponsePromise;
			const responseBody = await workflowsResponse.json();
			const totalWorkflows = responseBody.count;

			await pong.workflowSettingsModal.open();
			await expect(pong.workflowSettingsModal.getModal()).toBeVisible();

			await pong.workflowSettingsModal.getErrorWorkflowField().click();
			const optionCount = await pong.workflowSettingsModal.getVisiblePopoverOption().count();
			expect(optionCount).toBeGreaterThanOrEqual(totalWorkflows + 2);
			await pong.workflowSettingsModal.getVisiblePopoverOption().last().click();

			await pong.workflowSettingsModal.getTimezoneField().click();
			await expect(pong.workflowSettingsModal.getVisiblePopoverOption().first()).toBeVisible();
			await pong.workflowSettingsModal.getVisiblePopoverOption().nth(1).click();

			await pong.workflowSettingsModal.getSaveFailedExecutionsField().click();
			await expect(pong.workflowSettingsModal.getVisiblePopoverOption()).toHaveCount(3);
			await pong.workflowSettingsModal.getVisiblePopoverOption().last().click();

			await pong.workflowSettingsModal.getSaveSuccessExecutionsField().click();
			await expect(pong.workflowSettingsModal.getVisiblePopoverOption()).toHaveCount(3);
			await pong.workflowSettingsModal.getVisiblePopoverOption().last().click();

			await pong.workflowSettingsModal.getSaveManualExecutionsField().click();
			await expect(pong.workflowSettingsModal.getVisiblePopoverOption()).toHaveCount(3);
			await pong.workflowSettingsModal.getVisiblePopoverOption().last().click();

			await pong.workflowSettingsModal.getSaveExecutionProgressField().click();
			await expect(pong.workflowSettingsModal.getVisiblePopoverOption()).toHaveCount(3);
			await pong.workflowSettingsModal.getVisiblePopoverOption().last().click();

			await pong.workflowSettingsModal.getTimeoutSwitch().click();
			await pong.workflowSettingsModal.getTimeoutInput().fill('1');

			await pong.workflowSettingsModal.clickSave();

			await expect(pong.workflowSettingsModal.getModal()).toBeHidden();
			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
		});

		test.describe('Menu entry Push To Git', () => {
			test('should not show up in the menu for members @auth:member', async ({ pong }) => {
				await pong.workflowMenu.open();
				await expect(pong.workflowMenu.getPushToGitItem()).not.toBeAttached();
			});

			test('should show up for owners @auth:owner', async ({ pong }) => {
				await pong.workflowMenu.open();
				await expect(pong.workflowMenu.getPushToGitItem()).toBeVisible();
			});
		});
	},
);
