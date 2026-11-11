import {
	simpleAssistantResponse,
	aiDisabledRequirements,
	aiEnabledRequirements,
	aiEnabledWithWorkflowRequirements,
	aiEnabledWithQuickRepliesRequirements,
	aiEnabledWithEndSessionRequirements,
	aiEnabledWithSimpleChatRequirements,
} from '../../../config/ai-assistant-fixtures';
import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

type ChatRequestBody = {
	payload?: {
		type?: string;
		text?: string;
		question?: string;
		context?: Record<string, unknown>;
	};
};

const assistantOwner = { annotation: [{ type: 'owner', description: 'instanceAI' }] };

test.describe('AI Assistant::disabled', assistantOwner, () => {
	test('does not show assistant button if feature is disabled', async ({
		pong,
		setupRequirements,
	}) => {
		await setupRequirements(aiDisabledRequirements);
		await pong.start.fromBlankCanvas();
		await expect(pong.aiAssistant.getAskAssistantFloatingButton()).toHaveCount(0);
	});
});

test.describe('AI Assistant::enabled', assistantOwner, () => {
	test('renders placeholder UI', async ({ pong, setupRequirements }) => {
		await setupRequirements(aiEnabledRequirements);
		await pong.start.fromBlankCanvas();

		await expect(pong.aiAssistant.getAskAssistantCanvasActionButton()).toBeVisible();

		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();

		await expect(pong.aiAssistant.getAskAssistantChat()).toBeVisible();

		await expect(pong.aiAssistant.getPlaceholderMessage()).toBeVisible();

		await expect(pong.aiAssistant.getChatInput()).toBeVisible();

		await expect(pong.aiAssistant.getSendMessageButton()).toBeDisabled();

		await expect(pong.aiAssistant.getCloseChatButton()).toBeVisible();

		await pong.aiAssistant.getCloseChatButton().click();

		await expect(pong.aiAssistant.getAskAssistantChat()).toBeHidden();
	});

	test('should show resizer when chat is open', async ({ pong, setupRequirements }) => {
		await setupRequirements(aiEnabledRequirements);
		await pong.start.fromBlankCanvas();

		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();

		await expect(pong.aiAssistant.getAskAssistantSidebarResizer()).toBeVisible();

		await expect(pong.aiAssistant.getAskAssistantChat()).toBeVisible();

		await pong.aiAssistant.getAskAssistantSidebarResizer().hover();

		await pong.aiAssistant.getCloseChatButton().click();
	});

	test('should start chat session from node error view', async ({ pong, setupRequirements }) => {
		await setupRequirements(aiEnabledWithWorkflowRequirements);

		await pong.canvas.openNode('Stop and Error');

		await pong.ndv.execute();

		await expect(pong.aiAssistant.getNodeErrorViewAssistantButton()).toBeVisible();
		await expect(pong.aiAssistant.getNodeErrorViewAssistantButton()).toBeEnabled();

		await pong.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(pong.aiAssistant.getChatMessagesAll()).toHaveCount(1);

		await expect(pong.aiAssistant.getChatMessagesAll().first()).toContainText(
			'Hey, this is an assistant message',
		);
	});

	test('should render chat input correctly', async ({ pong, setupRequirements }) => {
		await setupRequirements(aiEnabledWithWorkflowRequirements);

		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();

		await expect(pong.aiAssistant.getAskAssistantChat()).toBeVisible();
		await expect(pong.aiAssistant.getChatInput()).toBeVisible();

		await expect(pong.aiAssistant.getSendMessageButton()).toBeDisabled();

		await pong.aiAssistant.getChatInput().fill('Test message');

		await expect(pong.aiAssistant.getChatInput()).toHaveValue('Test message');

		await expect(pong.aiAssistant.getSendMessageButton()).toBeEnabled();

		await pong.aiAssistant.getSendMessageButton().click();

		await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(pong.aiAssistant.getChatInput()).toHaveValue('');
	});

	test('should render and handle quick replies', async ({ pong, setupRequirements }) => {
		await setupRequirements(aiEnabledWithQuickRepliesRequirements);

		await pong.canvas.openNode('Stop and Error');

		await pong.ndv.execute();

		await pong.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(pong.aiAssistant.getQuickReplyButtons()).toHaveCount(2);

		await expect(pong.aiAssistant.getQuickReplyButtons()).toHaveCount(2);

		await pong.aiAssistant.getQuickReplyButtons().first().click();

		await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(pong.aiAssistant.getChatMessagesUser().first()).toContainText("Sure, let's do it");
	});

	test('should warn before starting a new session', async ({ pong, setupRequirements }) => {
		await setupRequirements(aiEnabledWithWorkflowRequirements);

		await pong.canvas.openNode('Edit Fields');

		await pong.ndv.execute();

		await pong.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(pong.aiAssistant.getChatMessagesAll()).toHaveCount(1);

		await pong.aiAssistant.getCloseChatButton().click();

		await pong.ndv.clickBackToCanvasButton();

		await pong.canvas.openNode('Stop and Error');

		await pong.ndv.execute();

		await pong.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(pong.aiAssistant.getNewAssistantSessionModal()).toBeVisible();

		await pong.aiAssistant.getStartNewSessionButton().click();

		await expect(pong.aiAssistant.getChatMessagesAll()).toHaveCount(1);
	});

	test('should end chat session when `end_session` event is received', async ({
		pong,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledWithEndSessionRequirements);

		await pong.canvas.openNode('Stop and Error');

		await pong.ndv.execute();

		await pong.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(pong.aiAssistant.getChatMessagesSystem()).toHaveCount(1);

		await expect(pong.aiAssistant.getChatMessagesSystem()).toHaveCount(1);

		await expect(pong.aiAssistant.getChatMessagesSystem().first()).toContainText(
			'session has ended',
		);
	});

	test('should reset session after it ended and sidebar is closed', async ({
		pong,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledRequirements);
		await pong.start.fromBlankCanvas();

		await pong.page.route('**/rest/ai/chat', async (route) => {
			const requestBody = route.request().postDataJSON() as ChatRequestBody;
			const isInit = requestBody.payload?.type === 'init-support-chat';
			const response = isInit
				? simpleAssistantResponse
				: {
						sessionId: '1',
						messages: [
							{
								role: 'assistant',
								type: 'message',
								title: 'Glad to Help',
								text: "I'm glad I could help. If you have any more questions or need further assistance with your pong workflows, feel free to ask!",
							},
							{
								role: 'assistant',
								type: 'event',
								eventName: 'end-session',
							},
						],
					};
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(response),
			});
		});

		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();
		await pong.aiAssistant.sendMessage('Hello', 'enter-key');

		await expect(pong.aiAssistant.getChatMessagesAll()).toHaveCount(2);

		await pong.aiAssistant.getCloseChatButton().click();
		// Wait for sidebar to close
		await expect(pong.aiAssistant.getAskAssistantChat()).toBeHidden();
		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();
		await expect(pong.aiAssistant.getChatMessagesAll()).toHaveCount(2);

		await pong.aiAssistant.sendMessage('Thanks, bye', 'enter-key');

		await expect(pong.aiAssistant.getChatMessagesSystem()).toHaveCount(1);
		await expect(pong.aiAssistant.getChatMessagesSystem().first()).toContainText(
			'session has ended',
		);

		await pong.aiAssistant.getCloseChatButton().click();
		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();
		await expect(pong.aiAssistant.getPlaceholderMessage()).toBeVisible();
	});

	test('should not reset assistant session when workflow is saved', async ({
		pong,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledWithSimpleChatRequirements);
		await pong.start.fromBlankCanvas();

		await pong.canvas.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		await pong.ndv.clickBackToCanvasButton();

		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();
		await pong.aiAssistant.sendMessage('Hello', 'enter-key');

		await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await pong.canvas.openNode(SCHEDULE_TRIGGER_NODE_NAME);
		await pong.ndv.execute();

		await expect(pong.aiAssistant.getPlaceholderMessage()).toHaveCount(0);
	});

	test('should send message via shift + enter even with global NodeCreator panel opened', async ({
		pong,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledWithSimpleChatRequirements);
		await pong.start.fromBlankCanvas();

		await pong.canvas.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		await pong.ndv.clickBackToCanvasButton();

		await pong.aiAssistant.getAskAssistantCanvasActionButton().click();
		await pong.canvas.nodeCreator.open();

		await pong.aiAssistant.sendMessage('Hello', 'enter-key');

		await expect(pong.aiAssistant.getPlaceholderMessage()).toHaveCount(0);
		await expect(pong.aiAssistant.getChatMessagesUser()).toHaveCount(1);
	});
});
