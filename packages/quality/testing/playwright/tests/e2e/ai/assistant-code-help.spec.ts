import {
	codeDiffSuggestionResponse,
	applyCodeDiffResponse,
	nodeExecutionSucceededResponse,
	aiEnabledWorkflowBaseRequirements,
	aiEnabledWithCodeDiffRequirements,
} from '../../../config/ai-assistant-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'AI Assistant::enabled',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe('Code Node Error Help', () => {
			test('should apply code diff to code node', async ({ pong, setupRequirements }) => {
				await setupRequirements(aiEnabledWithCodeDiffRequirements);

				let applySuggestionCalls = 0;
				await pong.page.route('**/rest/ai/chat/apply-suggestion', async (route) => {
					applySuggestionCalls += 1;
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(applyCodeDiffResponse),
					});
				});

				await pong.canvas.openNode('Code');

				await pong.ndv.execute();

				await pong.aiAssistant.getNodeErrorViewAssistantButton().click();

				await expect(pong.aiAssistant.getChatMessagesAll()).toHaveCount(2);
				await expect(pong.aiAssistant.getCodeDiffs()).toHaveCount(1);
				await expect(pong.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(1);

				await pong.aiAssistant.getApplyCodeDiffButtons().first().click();

				await expect(pong.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(0);
				await expect(pong.aiAssistant.getUndoReplaceCodeButtons()).toHaveCount(1);
				await expect(pong.aiAssistant.getCodeReplacedMessage()).toBeVisible();
				await expect(pong.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1');

				await pong.aiAssistant.getUndoReplaceCodeButtons().first().click();

				await expect(pong.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(1);
				await expect(pong.aiAssistant.getCodeReplacedMessage()).toHaveCount(0);
				expect(applySuggestionCalls).toBe(1);
				await expect(pong.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1aaa');

				await pong.aiAssistant.getApplyCodeDiffButtons().first().click();

				await expect(pong.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1');
			});

			test('should ignore node execution success and error messages after the node run successfully once', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(aiEnabledWorkflowBaseRequirements);

				let chatRequestCount = 0;
				await pong.page.route('**/rest/ai/chat', async (route) => {
					chatRequestCount += 1;
					const response =
						chatRequestCount === 1 ? codeDiffSuggestionResponse : nodeExecutionSucceededResponse;
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(response),
					});
				});

				await pong.canvas.openNode('Code');
				await pong.ndv.execute();
				await pong.aiAssistant.getNodeErrorViewAssistantButton().click();

				await pong.ndv
					.getCodeEditor()
					.fill(
						"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();",
					);

				await pong.ndv.execute();

				await pong.ndv
					.getCodeEditor()
					.fill(
						"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1aaaa!;\n}\n\nreturn $input.all();",
					);

				await pong.ndv.execute();

				await expect(pong.aiAssistant.getChatMessagesAssistant().nth(2)).toContainText(
					'Code node ran successfully, did my solution help resolve your issue?',
				);
			});
		});
	},
);
