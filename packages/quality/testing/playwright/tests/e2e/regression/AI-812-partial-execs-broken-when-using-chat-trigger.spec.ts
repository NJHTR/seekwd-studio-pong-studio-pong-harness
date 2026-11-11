import { test, expect } from '../../../fixtures/base';

test.describe(
	'AI-812-partial-execs-broken-when-using-chat-trigger',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_chat_partial_execution.json');
			await pong.notifications.quickCloseAll();
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.deselectAll();
		});

		test.afterEach(async ({ pong }) => {
			await pong.notifications.quickCloseAll();
			await pong.canvas.logsPanel.clearExecutionData();
			await pong.canvas.logsPanel.sendManualChatMessage('Test Full Execution');

			await expect(pong.canvas.logsPanel.getManualChatMessages()).toHaveCount(4);

			await expect(pong.canvas.logsPanel.getManualChatMessages().last()).toContainText(
				'Set 3 with chatInput: Test Full Execution',
			);
		});

		// TODO(CET-309): engine v2 does not run the chat trigger yet.
		test('should do partial execution when using chat trigger and clicking NDV execute node @engine:v2-pending', async ({
			pong,
		}) => {
			await pong.canvas.openNode('Edit Fields1');
			await pong.ndv.execute();

			await expect(pong.canvas.logsPanel.getManualChatModal()).toBeVisible();
			await pong.canvas.logsPanel.sendManualChatMessage('Test Partial Execution');

			await expect(pong.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);
			await expect(pong.canvas.logsPanel.getManualChatMessages().first()).toContainText(
				'Test Partial Execution',
			);
			await expect(pong.canvas.logsPanel.getManualChatMessages().last()).toContainText(
				'Set 2 with chatInput: Test Partial Execution',
			);
		});

		// TODO(CET-309): engine v2 does not run the chat trigger yet.
		test('should do partial execution when using chat trigger and context-menu execute node @engine:v2-pending', async ({
			pong,
		}) => {
			// Workaround to prevent the context menu be blocked by the tabbar
			await pong.canvas.dragNodeToRelativePosition('Edit Fields', 0, -100);
			await pong.canvas.executeNodeFromContextMenu('Edit Fields');

			await expect(pong.canvas.logsPanel.getManualChatModal()).toBeVisible();
			await pong.canvas.logsPanel.sendManualChatMessage('Test Partial Execution');

			await expect(pong.canvas.logsPanel.getManualChatMessages()).toHaveCount(2);
			await expect(pong.canvas.logsPanel.getManualChatMessages().first()).toContainText(
				'Test Partial Execution',
			);
			await expect(pong.canvas.logsPanel.getManualChatMessages().last()).toContainText(
				'Set 1 with chatInput: Test Partial Execution',
			);
		});
	},
);
