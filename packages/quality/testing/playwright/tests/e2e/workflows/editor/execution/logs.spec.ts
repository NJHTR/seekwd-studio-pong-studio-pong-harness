import { test, expect, executionLogsTestConfig } from './fixtures';

test.use(executionLogsTestConfig);

// Node name constants
const NODES = {
	MANUAL_TRIGGER: 'When clicking ‘Execute workflow’',
	CODE: 'Code',
	LOOP_OVER_ITEMS: 'Loop Over Items',
	WAIT: 'Wait',
	CODE1: 'Code1',
	SCHEDULE_TRIGGER: 'Schedule Trigger',
	EDIT_FIELDS: 'Edit Fields',
	IF: 'If',
	WAIT_NODE: 'Wait node',
};

test.describe(
	'Logs',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should populate logs as manual execution progresses', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements({ workflow: 'Workflow_loop.json' });

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.logsPanel.open();
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(0);

			await pong.canvas.clickExecuteWorkflowButton();

			await expect(
				pong.canvas.logsPanel.getOverviewStatus().filter({ hasText: 'Running' }),
			).toBeVisible();

			await expect(pong.canvas.logsPanel.getLogEntries().nth(0)).toContainText(NODES.MANUAL_TRIGGER);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText(NODES.CODE);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(2)).toContainText(
				NODES.LOOP_OVER_ITEMS,
			);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(3)).toContainText(NODES.WAIT);

			await expect(pong.canvas.logsPanel.getLogEntries().nth(4)).toContainText(
				NODES.LOOP_OVER_ITEMS,
			);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(5)).toContainText(NODES.WAIT);

			await expect(pong.canvas.logsPanel.getLogEntries().nth(6)).toContainText(
				NODES.LOOP_OVER_ITEMS,
			);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(7)).toContainText(NODES.WAIT);

			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(10);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(8)).toContainText(
				NODES.LOOP_OVER_ITEMS,
			);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(9)).toContainText(NODES.CODE1);
			await expect(
				pong.canvas.logsPanel.getOverviewStatus().filter({ hasText: /Error in [\d.]+s/ }),
			).toBeVisible();
			await expect(pong.canvas.logsPanel.getSelectedLogEntry()).toContainText(NODES.CODE1); // Errored node is automatically selected
			await expect(pong.canvas.logsPanel.outputPanel.getNodeErrorMessageHeader()).toContainText(
				'test!!! [line 1]',
			);
			await expect(pong.canvas.getNodeIssuesByName(NODES.CODE1)).toBeVisible();

			await pong.canvas.logsPanel.getClearExecutionButton().click();
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(0);
			await expect(pong.canvas.getNodeIssuesByName(NODES.CODE1)).toBeHidden();
		});

		test('should show the actions menu when the overflow button is clicked', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements({ workflow: 'Workflow_if.json' });

			await pong.canvas.logsPanel.open();
			await pong.canvas.logsPanel.openActions();

			await expect(pong.canvas.logsPanel.getSyncSelectionMenuItem()).toBeVisible();
		});

		test('should allow to trigger partial execution', async ({ pong, setupRequirements }) => {
			await setupRequirements({ workflow: 'Workflow_if.json' });

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.logsPanel.open();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(6);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(0)).toContainText(
				NODES.SCHEDULE_TRIGGER,
			);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText(NODES.CODE);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(2)).toContainText(NODES.EDIT_FIELDS);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(3)).toContainText(NODES.IF);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(4)).toContainText(NODES.EDIT_FIELDS);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(5)).toContainText(NODES.EDIT_FIELDS);

			await pong.canvas.logsPanel.clickTriggerPartialExecutionAtRow(3);
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(3);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(0)).toContainText(
				NODES.SCHEDULE_TRIGGER,
			);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText(NODES.CODE);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(2)).toContainText(NODES.IF);
		});

		test('should show input and output data in the selected display mode', async ({
			pong,
			anthropicCredential,
			setupRequirements,
		}) => {
			await setupRequirements({ workflow: 'Workflow_ai_agent.json' });

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.openNode('E2E Chat Model');
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(anthropicCredential.name);
			await pong.ndv.close();
			await pong.canvas.logsPanel.open();
			await pong.canvas.logsPanel.sendManualChatMessage('Hi!');
			await expect(pong.canvas.logsPanel.getManualChatMessages().nth(0)).toContainText('Hi!');
			await expect(pong.canvas.logsPanel.getManualChatMessages().nth(1)).toContainText('Hello');
			await expect(pong.canvas.logsPanel.getLogEntries().nth(2)).toHaveText('E2E Chat Model');

			await expect(pong.canvas.logsPanel.outputPanel.get()).toContainText('Hello');
			await pong.canvas.logsPanel.outputPanel.switchDisplayMode('table');
			await expect(pong.canvas.logsPanel.outputPanel.getTbodyCell(0, 0)).toContainText('text:Hello');
			await expect(pong.canvas.logsPanel.outputPanel.getTbodyCell(0, 1)).toContainText(
				/completionTokens:\d+promptTokens:\d+totalTokens:\d+/,
			);
			await pong.canvas.logsPanel.outputPanel.switchDisplayMode('schema');
			await expect(pong.canvas.logsPanel.outputPanel.get()).toContainText('generations[0]');
			await expect(pong.canvas.logsPanel.outputPanel.get()).toContainText('Hello');
			await pong.canvas.logsPanel.outputPanel.switchDisplayMode('json');
			await expect(pong.canvas.logsPanel.outputPanel.get()).toContainText(
				/\[\s*{\s*"response":\s*{\s*"generations":\s*\[/,
			);

			await expect(pong.canvas.logsPanel.inputPanel.get()).toContainText('Human: Hi!');
			await pong.canvas.logsPanel.inputPanel.switchDisplayMode('table');
			await expect(pong.canvas.logsPanel.inputPanel.getTbodyCell(0, 0)).toContainText(
				'0:Human: Hi!',
			);
			await pong.canvas.logsPanel.inputPanel.switchDisplayMode('schema');
			await expect(pong.canvas.logsPanel.inputPanel.get()).toContainText('messages[0]');
			await expect(pong.canvas.logsPanel.inputPanel.get()).toContainText('Human: Hi!');
			await pong.canvas.logsPanel.inputPanel.switchDisplayMode('json');
			await expect(pong.canvas.logsPanel.inputPanel.get()).toContainText(
				/\[\s*{\s*"messages":\s*\[\s*"Human: Hi!"\s*\],/,
			);
		});

		test('should show input and output data of correct run index and branch', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements({ workflow: 'Workflow_if.json' });

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.logsPanel.open();
			await pong.canvas.clickExecuteWorkflowButton();

			await pong.canvas.logsPanel.clickLogEntryAtRow(2); // Run #1 of 'Edit Fields' node; input is 'Code' node
			await pong.canvas.logsPanel.toggleInputPanel();
			await pong.canvas.logsPanel.inputPanel.get().hover();
			await pong.canvas.logsPanel.inputPanel.switchDisplayMode('table');
			await expect(pong.canvas.logsPanel.inputPanel.getTableRows()).toHaveCount(11);
			await expect(pong.canvas.logsPanel.inputPanel.getTbodyCell(0, 0)).toContainText('0');
			await expect(pong.canvas.logsPanel.inputPanel.getTbodyCell(9, 0)).toContainText('9');
			await pong.canvas.logsPanel.clickOpenNdvAtRow(2);
			await pong.ndv.inputPanel.switchDisplayMode('table');
			await expect(pong.ndv.getInputSelect()).toHaveValue(`${NODES.CODE} `);
			await expect(pong.ndv.inputPanel.getTableRows()).toHaveCount(11);
			await expect(pong.ndv.inputPanel.getTbodyCell(0, 0)).toContainText('0');
			await expect(pong.ndv.inputPanel.getTbodyCell(9, 0)).toContainText('9');
			await expect(pong.ndv.outputPanel.getRunSelectorInput()).toHaveValue('1 of 3 (10 items)');

			await pong.ndv.clickBackToCanvasButton();

			await pong.canvas.logsPanel.clickLogEntryAtRow(4); // Run #2 of 'Edit Fields' node; input is false branch of 'If' node
			await expect(pong.canvas.logsPanel.inputPanel.getTableRows()).toHaveCount(6);
			await expect(pong.canvas.logsPanel.inputPanel.getTbodyCell(0, 0)).toContainText('5');
			await expect(pong.canvas.logsPanel.inputPanel.getTbodyCell(4, 0)).toContainText('9');
			await pong.canvas.logsPanel.clickOpenNdvAtRow(4);
			await expect(pong.ndv.getInputSelect()).toHaveValue(`${NODES.IF} `);
			await expect(pong.ndv.inputPanel.getTableRows()).toHaveCount(6);
			await expect(pong.ndv.inputPanel.getTbodyCell(0, 0)).toContainText('5');
			await expect(pong.ndv.inputPanel.getTbodyCell(4, 0)).toContainText('9');
			await expect(pong.ndv.outputPanel.getRunSelectorInput()).toHaveValue('2 of 3 (5 items)');

			await pong.ndv.clickBackToCanvasButton();

			await pong.canvas.logsPanel.clickLogEntryAtRow(5); // Run #3 of 'Edit Fields' node; input is true branch of 'If' node
			await expect(pong.canvas.logsPanel.inputPanel.getTableRows()).toHaveCount(6);
			await expect(pong.canvas.logsPanel.inputPanel.getTbodyCell(0, 0)).toContainText('0');
			await expect(pong.canvas.logsPanel.inputPanel.getTbodyCell(4, 0)).toContainText('4');
			await pong.canvas.logsPanel.clickOpenNdvAtRow(5);
			await expect(pong.ndv.getInputSelect()).toHaveValue(`${NODES.IF} `);
			await expect(pong.ndv.inputPanel.getTableRows()).toHaveCount(6);
			await expect(pong.ndv.inputPanel.getTbodyCell(0, 0)).toContainText('0');
			await expect(pong.ndv.inputPanel.getTbodyCell(4, 0)).toContainText('4');
			await expect(pong.ndv.outputPanel.getRunSelectorInput()).toHaveValue('3 of 3 (5 items)');
		});

		test('should keep populated logs unchanged when workflow get edits after the execution', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements({ workflow: 'Workflow_if.json' });

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.logsPanel.open();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(6);
			await pong.canvas.nodeDisableButton(NODES.EDIT_FIELDS).click();
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(6);
			await pong.canvas.deleteNodeByName(NODES.IF);
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(6);
		});

		test('should show logs for a past execution', async ({
			pong,
			anthropicCredential,
			setupRequirements,
		}) => {
			await setupRequirements({ workflow: 'Workflow_ai_agent.json' });

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.openNode('E2E Chat Model');
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(anthropicCredential.name);
			await pong.ndv.close();
			await pong.canvas.logsPanel.open();

			await pong.canvas.logsPanel.sendManualChatMessage('Hi!');
			await pong.notifications.waitForNotificationAndClose('Successful');
			await pong.canvas.openExecutions();
			await pong.executions.getAutoRefreshButton().click();
			await expect(pong.executions.logsPanel.getManualChatMessages().nth(0)).toContainText('Hi!');
			await expect(pong.executions.logsPanel.getManualChatMessages().nth(1)).toContainText('Hello');
			await expect(
				pong.executions.logsPanel.getOverviewStatus().filter({ hasText: /Success in [\d.]+m?s/ }),
			).toBeVisible();
			await expect(pong.executions.logsPanel.getLogEntries()).toHaveCount(3);
			await expect(pong.executions.logsPanel.getLogEntries().nth(0)).toContainText(
				'When chat message received',
			);
			await expect(pong.executions.logsPanel.getLogEntries().nth(1)).toContainText('AI Agent');
			await expect(pong.executions.logsPanel.getLogEntries().nth(2)).toContainText('E2E Chat Model');
		});

		test('should refresh chat history when switching between past executions', async ({
			pong,
			anthropicCredential,
			setupRequirements,
		}) => {
			await setupRequirements({ workflow: 'Workflow_ai_agent.json' });

			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.openNode('E2E Chat Model');
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(anthropicCredential.name);
			await pong.ndv.close();
			await pong.canvas.logsPanel.open();

			// Prompts must match MockServer expectations under expectations/execution.logs
			// (strictBodyMatching). Use refreshSession between turns so each Anthropic
			// request stays single-message and matches a recorded expectation.
			await pong.canvas.logsPanel.sendManualChatMessage('Hi!');
			await expect(pong.canvas.logsPanel.getManualChatMessages().nth(0)).toContainText('Hi!');
			await expect(pong.canvas.logsPanel.getManualChatMessages().nth(1)).toContainText('Hello');

			await pong.canvas.logsPanel.refreshSession();
			await expect(pong.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();

			await pong.canvas.logsPanel.sendManualChatMessage('Hey!');
			await expect(pong.canvas.logsPanel.getManualChatMessages().nth(0)).toContainText('Hey!');
			await expect(pong.canvas.logsPanel.getManualChatMessages().nth(1)).toContainText('Hello');

			await pong.canvas.openExecutions();
			await pong.executions.getAutoRefreshButton().click();
			await expect(pong.executions.getExecutionItems()).toHaveCount(2);

			// Newest execution first
			await pong.executions.getExecutionItems().nth(0).click();
			await expect(pong.executions.logsPanel.getManualChatMessages().nth(0)).toContainText('Hey!');
			await expect(pong.executions.logsPanel.getManualChatMessages().nth(1)).toContainText('Hello');

			await pong.executions.getExecutionItems().nth(1).click();
			await expect(pong.executions.logsPanel.getManualChatMessages().nth(0)).toContainText('Hi!');
			await expect(pong.executions.logsPanel.getManualChatMessages().nth(1)).toContainText('Hello');

			await pong.executions.getExecutionItems().nth(0).click();
			await expect(pong.executions.logsPanel.getManualChatMessages().nth(0)).toContainText('Hey!');
		});

		test('should show logs for a workflow with a node that waits for webhook', async ({
			pong,
			api,
		}) => {
			await pong.start.fromImportedWorkflow('Workflow_wait_for_webhook.json');
			await pong.canvas.deselectAll();
			await pong.canvas.logsPanel.open();

			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.getWaitingNodes()).toContainText(NODES.WAIT_NODE);
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(2);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText(NODES.WAIT_NODE);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText('Waiting');

			await pong.canvas.openNode(NODES.WAIT_NODE);
			const webhookUrl = await pong.ndv.outputPanel.getFirstLink().getAttribute('href');
			await pong.ndv.clickBackToCanvasButton();

			// [CAT-1454] Assert that no duplicate logs added at this point
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(2);

			// Trigger the webhook
			const response = await api.webhooks.trigger(webhookUrl!);
			expect(response.status()).toBe(200);

			await expect(pong.canvas.getWaitingNodes()).toBeHidden();
			await expect(
				pong.canvas.logsPanel.getOverviewStatus().filter({ hasText: /Success in [\d.]+m?s/ }),
			).toBeVisible();
			await pong.canvas.logsPanel.getLogEntries().nth(1).click(); // click selected row to deselect
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(2);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText(NODES.WAIT_NODE);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText('Success');
		});

		test('should allow to cancel a workflow with a node that waits for webhook', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow('Workflow_wait_for_webhook.json');
			await pong.canvas.deselectAll();
			await pong.canvas.logsPanel.open();

			await pong.canvas.clickExecuteWorkflowButton();

			await expect(pong.canvas.getWaitingNodes()).toContainText(NODES.WAIT_NODE);
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(2);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(0)).toContainText(
				'When clicking ‘Test workflow’',
			);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(1)).toContainText(NODES.WAIT_NODE);

			await pong.canvas.stopExecutionButton().click();
			await expect(pong.canvas.stopExecutionButton()).toBeHidden();
			await expect(pong.canvas.logsPanel.getOverviewStatus()).toContainText('Canceled in');
			await expect(pong.canvas.logsPanel.getLogEntries()).toHaveCount(1);
			await expect(pong.canvas.logsPanel.getLogEntries().nth(0)).toContainText(
				'When clicking ‘Test workflow’',
			);
		});
	},
);
