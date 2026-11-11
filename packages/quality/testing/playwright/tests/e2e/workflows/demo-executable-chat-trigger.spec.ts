import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

const chatTriggerNodes = [
	{
		parameters: { options: {} },
		id: 'chat-trigger-1',
		name: 'When chat message received',
		type: '@pong/nodes-langchain.chatTrigger',
		typeVersion: 1.1,
		position: [0, 0] as [number, number],
	},
	{
		parameters: {
			assignments: {
				assignments: [
					{
						id: 'assign-1',
						name: 'text',
						value: '=Got: {{ $json.chatInput }}',
						type: 'string',
					},
				],
			},
			options: {},
		},
		id: 'set-1',
		name: 'Edit Fields',
		type: 'pong-nodes-base.set',
		typeVersion: 3.4,
		position: [220, 0] as [number, number],
	},
];

const chatTriggerConnections = {
	'When chat message received': {
		main: [[{ node: 'Edit Fields', type: 'main' as const, index: 0 }]],
	},
};

test.describe(
	'Demo executable preview - Chat Trigger',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		test('hides execute button and exposes Open chat that opens logs panel', async ({
			pong,
			api,
		}) => {
			// Create the workflow via API so it exists in the database
			const workflow = await api.workflows.createWorkflow({
				name: 'Chat Trigger Preview',
				nodes: chatTriggerNodes,
				connections: chatTriggerConnections,
			});

			await pong.demo.goto({ canExecute: true });
			await pong.demo.importWorkflow({
				...workflow,
				nodes: chatTriggerNodes,
				connections: chatTriggerConnections,
			});

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
			await expect(pong.canvas.nodeByName('When chat message received')).toBeVisible();

			await expect(pong.canvas.getExecuteWorkflowButton()).toBeHidden();
			await expect(pong.canvas.getOpenChatButton()).toBeVisible();

			await pong.canvas.getOpenChatButton().click();

			await expect(pong.canvas.getChatPanel()).toBeVisible();
			await expect(pong.canvas.getHideChatButton()).toBeVisible();

			// Send a chat message and verify execution completes via the logs panel
			const chatInput = pong.canvas.logsPanel.getManualChatInput();
			await chatInput.fill('hello world');
			await chatInput.press('Enter');

			// The user message should appear in the chat
			await expect(pong.canvas.logsPanel.getManualChatMessages().nth(0)).toContainText(
				'hello world',
			);

			// Execution should complete — logs panel shows success entries
			await expect(pong.canvas.logsPanel.getLogEntries()).not.toHaveCount(0, { timeout: 30_000 });
		});
	},
);
