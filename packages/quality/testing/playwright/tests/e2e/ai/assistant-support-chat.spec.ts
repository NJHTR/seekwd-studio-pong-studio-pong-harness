import {
	simpleAssistantResponse,
	aiEnabledWithCodeSnippetRequirements,
	aiEnabledWithHttpWorkflowRequirements,
} from '../../../config/ai-assistant-fixtures';
import { HTTP_REQUEST_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

type ChatRequestBody = {
	payload?: {
		type?: string;
		text?: string;
		question?: string;
		context?: Record<string, unknown>;
	};
};

test.describe(
	'AI Assistant::enabled',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe('Support Chat', () => {
			test('assistant returns code snippet', async ({ pong, setupRequirements }) => {
				await setupRequirements(aiEnabledWithCodeSnippetRequirements);
				await pong.start.fromBlankCanvas();

				await expect(pong.aiAssistant.getAskAssistantCanvasActionButton()).toBeVisible();
				await pong.aiAssistant.getAskAssistantCanvasActionButton().click();

				await expect(pong.aiAssistant.getAskAssistantChat()).toBeVisible();

				await pong.aiAssistant.sendMessage('Show me an expression');

				await expect(pong.aiAssistant.getChatMessagesAll()).toHaveCount(3);
				await expect(pong.aiAssistant.getChatMessagesUser().first()).toContainText(
					'Show me an expression',
				);
				await expect(pong.aiAssistant.getChatMessagesAssistant().first()).toContainText(
					'To use expressions in pong, follow these steps:',
				);
				await expect(pong.aiAssistant.getChatMessagesAssistant().first()).toContainText('New York');
				await expect(pong.aiAssistant.getCodeSnippet()).toHaveText('{{$json.body.city}}');
			});

			test('should send current context to support chat', async ({ pong, setupRequirements }) => {
				await setupRequirements(aiEnabledWithHttpWorkflowRequirements);

				const chatRequests: ChatRequestBody[] = [];
				await pong.page.route('**/rest/ai/chat', async (route) => {
					const body = route.request().postDataJSON() as ChatRequestBody;
					chatRequests.push(body);
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(simpleAssistantResponse),
					});
				});

				await pong.aiAssistant.getAskAssistantCanvasActionButton().click();
				await pong.aiAssistant.sendMessage('What is wrong with this workflow?');

				const supportRequest = chatRequests.find(
					(request) => request.payload?.question === 'What is wrong with this workflow?',
				);
				expect(supportRequest).toBeDefined();
				const supportContext = supportRequest?.payload?.context;
				expect(supportContext).toBeDefined();
				expect(supportContext?.currentView).toBeDefined();
				expect(supportContext?.currentWorkflow).toBeDefined();
			});

			test('should not send workflow context if nothing changed', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(aiEnabledWithHttpWorkflowRequirements);

				const chatRequests: ChatRequestBody[] = [];
				await pong.page.route('**/rest/ai/chat', async (route) => {
					const body = route.request().postDataJSON() as ChatRequestBody;
					chatRequests.push(body);
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(simpleAssistantResponse),
					});
				});

				await pong.aiAssistant.getAskAssistantCanvasActionButton().click();

				await pong.aiAssistant.sendMessage('What is wrong with this workflow?', 'enter-key');
				await expect(pong.aiAssistant.getChatMessagesAssistant()).toHaveCount(1);
				await pong.aiAssistant.waitForStreamingComplete();

				await pong.aiAssistant.sendMessage('And now?', 'enter-key');
				await expect(pong.aiAssistant.getChatMessagesAssistant()).toHaveCount(2);
				const secondRequest = chatRequests.find((request) => request.payload?.text === 'And now?');
				const secondContext = secondRequest?.payload?.context;
				expect(secondContext?.currentWorkflow).toBeUndefined();
				await pong.aiAssistant.waitForStreamingComplete();

				await pong.canvas.openNode(HTTP_REQUEST_NODE_NAME);
				await pong.ndv.setParameterInputValue('url', 'https://example.com');
				await pong.ndv.close();
				await pong.canvas.clickExecuteWorkflowButton();

				await pong.aiAssistant.sendMessage('What about now?', 'enter-key');
				await expect(pong.aiAssistant.getChatMessagesAssistant()).toHaveCount(3);

				const thirdRequest = chatRequests.find(
					(request) => request.payload?.text === 'What about now?',
				);
				const thirdContext = thirdRequest?.payload?.context;
				expect(thirdContext?.currentWorkflow).toBeTruthy();
				expect(thirdContext?.executionData).toBeTruthy();
			});
		});
	},
);
