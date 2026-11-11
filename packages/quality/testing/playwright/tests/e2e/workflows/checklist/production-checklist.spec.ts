import { test, expect } from '../../../../fixtures/base';

const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

test.describe(
	'Workflow Production Checklist',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should show suggested actions automatically when workflow is first published', async ({
			pong,
		}) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

			await pong.canvas.clickWorkflowMenu();
			await expect(pong.canvas.getProductionChecklistMenuItem()).toBeHidden();
			await pong.page.keyboard.press('Escape');

			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();
			await expect(pong.canvas.getErrorActionItem()).toBeVisible();
			await expect(pong.canvas.getTimeSavedActionItem()).toBeVisible();

			// The checklist reopens from the workflow menu
			await pong.page.keyboard.press('Escape');
			await pong.canvas.openProductionChecklist();
			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();
		});

		test('should display evaluations action when AI node exists and feature is enabled', async ({
			pong,
		}) => {
			await pong.api.enableFeature('evaluation');

			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode('OpenAI', { action: 'Message a model', closeNDV: true });

			await pong.canvas.nodeDisableButton('Message a model').click();

			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(pong.canvas.getEvaluationsActionItem()).toBeVisible();
			await pong.canvas.getEvaluationsActionItem().click();

			await expect(pong.page).toHaveURL(/\/evaluation/);
		});

		test('should open workflow settings modal when error workflow action is clicked', async ({
			pong,
		}) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();

			const errorAction = pong.canvas.getErrorActionItem();
			await expect(errorAction).toBeVisible();
			await errorAction.click();

			await expect(pong.workflowSettingsModal.getModal()).toBeVisible();
			await expect(pong.workflowSettingsModal.getErrorWorkflowField()).toBeVisible();
		});

		test('should open workflow settings modal when time saved action is clicked', async ({
			pong,
		}) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();

			const timeAction = pong.canvas.getTimeSavedActionItem();
			await expect(timeAction).toBeVisible();
			await timeAction.click();

			await expect(pong.workflowSettingsModal.getModal()).toBeVisible();
		});

		test('should keep the checklist available after closing it', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();

			// The close button only dismisses the popover; nothing is persisted
			await pong.canvas.closeProductionChecklist();
			await expect(pong.canvas.getProductionChecklistPopover()).toBeHidden();

			await pong.canvas.openProductionChecklist();
			await expect(pong.canvas.getErrorActionItem()).toBeVisible();
			await expect(pong.canvas.getTimeSavedActionItem()).toBeVisible();
		});

		test('should not reopen the checklist automatically after a page reload', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();
			await pong.canvas.closeProductionChecklist();
			await expect(pong.canvas.getProductionChecklistPopover()).toBeHidden();

			await pong.canvas.trackProductionChecklistOpens();
			const publicationStatusLoaded = pong.canvas.waitForPublicationStatusResponse();
			await pong.page.reload();
			await publicationStatusLoaded;

			// The auto-open waits for the publication status and the settings cache. The menu item
			// needs the cache too, so once it shows, the auto-open has made its decision.
			await pong.canvas.clickWorkflowMenu();
			await expect(pong.canvas.getProductionChecklistMenuItem()).toBeVisible();
			// Opening the menu closes the checklist, so check whether it showed at any time
			expect(await pong.canvas.wasProductionChecklistOpened()).toBe(false);
		});

		test('should allow ignoring individual actions', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();
			await expect(pong.canvas.getErrorActionItem()).toBeVisible();

			await pong.canvas.ignoreProductionChecklistAction();
			await expect(pong.canvas.getErrorActionItem()).toBeHidden();
			await expect(pong.canvas.getTimeSavedActionItem()).toBeVisible();

			// The ignored action stays hidden after a reload
			await pong.page.reload();
			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();
			await pong.canvas.openProductionChecklist();

			await expect(pong.canvas.getTimeSavedActionItem()).toBeVisible();
			await expect(pong.canvas.getErrorActionItem()).toBeHidden();
		});

		test('should allow ignoring all actions for all workflows with confirmation', async ({
			pong,
		}) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();

			await pong.canvas.clickProductionChecklistIgnoreAll();
			await pong.canvas.confirmIgnoreAllForAllWorkflows();

			await expect(pong.canvas.getProductionChecklistPopover()).toBeHidden();
			await pong.canvas.clickWorkflowMenu();
			await expect(pong.canvas.getProductionChecklistMenuItem()).toBeHidden();
			await pong.page.keyboard.press('Escape');

			// Another workflow does not show the checklist on its first publish
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();

			// The editor saves the first activation date after it decides whether to open the checklist
			const secondWorkflowId = pong.canvas.getWorkflowIdFromUrl();
			await expect
				.poll(async () => await pong.canvas.getChecklistFirstActivatedAt(secondWorkflowId))
				.toBeDefined();
			await expect(pong.canvas.getProductionChecklistPopover()).toBeHidden();
			await pong.canvas.clickWorkflowMenu();
			await expect(pong.canvas.getProductionChecklistMenuItem()).toBeHidden();
		});

		// Flaky in multi-main mode
		test.fixme('should show completed state for configured actions', async ({ pong, api }) => {
			const errorWorkflow = await api.workflows.createWorkflow({
				name: 'Error Handler',
				nodes: [
					{
						id: 'error-trigger',
						name: 'Error Trigger',
						type: 'pong-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: {},
				active: false,
			});
			await api.workflows.activate(errorWorkflow.id, errorWorkflow.versionId);

			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.publishWorkflow();
			await expect(pong.workflowActivationModal.getModal()).toBeVisible();
			await pong.workflowActivationModal.close();

			await pong.workflowSettingsModal.open();
			await expect(pong.workflowSettingsModal.getModal()).toBeVisible();

			await pong.workflowSettingsModal.selectErrorWorkflow('Error Handler');
			await pong.workflowSettingsModal.clickSave();
			await expect(pong.workflowSettingsModal.getModal()).toBeHidden();

			await pong.canvas.openProductionChecklist();
			await expect(pong.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(pong.canvas.getProductionChecklistActionCompletedIcon()).toBeVisible();
		});
	},
);
