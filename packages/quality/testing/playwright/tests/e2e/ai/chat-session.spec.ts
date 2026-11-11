import { test, expect } from '../../../fixtures/base';

test.describe(
	'Chat session ID reset',
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

		test('should update session ID in node output when session is reset', async ({ pong }) => {
			await pong.canvas.logsPanel.open();
			await pong.canvas.logsPanel.sendManualChatMessage('Test message 1');
			await expect(pong.canvas.logsPanel.manualChat.getLatestBotMessage()).toHaveText(
				'Set 3 with chatInput: Test message 1',
			);

			const initialSessionId = await pong.canvas.logsPanel.getSessionId(pong.clipboard);
			await pong.canvas.logsPanel.clickLogEntryAtRow(0);
			await expect(pong.canvas.logsPanel.outputPanel.getTbodyCell(0, 1)).toContainText(
				initialSessionId,
			);

			await pong.canvas.logsPanel.refreshSession();
			await expect(pong.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();

			const newSessionId = await pong.canvas.logsPanel.getSessionId(pong.clipboard);
			expect(newSessionId).not.toEqual(initialSessionId);

			await pong.canvas.logsPanel.sendManualChatMessage('Test message 2');
			await expect(pong.canvas.logsPanel.manualChat.getLatestBotMessage()).toHaveText(
				'Set 3 with chatInput: Test message 2',
			);

			await expect(pong.canvas.logsPanel.outputPanel.getTbodyCell(0, 1)).toContainText(newSessionId);
		});
	},
);
