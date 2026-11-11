import { test, expect } from '../../../fixtures/base';

test.use({
	capability: { services: ['proxy'], env: { PONG_DEPRECATED_NODES_BLOCK: 'false' } },
});
test.describe(
	'Langchain Integration',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test.beforeEach(async ({ pong, services }) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('langchain');
			await pong.canvas.openNewWorkflow();
		});

		test.describe('Advanced Workflow Features', () => {
			test('should render runItems for sub-nodes and allow switching between them', async ({
				pong,
			}) => {
				await pong.start.fromImportedWorkflow('In_memory_vector_store_fake_embeddings.json');
				await pong.canvas.clickZoomToFitButton();
				await pong.canvas.deselectAll();

				await pong.canvas.executeNode('Populate VS');
				await expect(pong.canvas.getNodeSuccessStatusIndicator('Populate VS')).toBeVisible({
					timeout: 30_000,
				});
				await pong.notifications.quickCloseAll();

				const assertInputOutputTextExists = async (text: string) => {
					await expect(pong.ndv.getOutputPanel()).toContainText(text);
					await expect(pong.ndv.getInputPanel()).toContainText(text);
				};

				const assertInputOutputTextNotExists = async (text: string) => {
					await expect(pong.ndv.getOutputPanel()).not.toContainText(text);
					await expect(pong.ndv.getInputPanel()).not.toContainText(text);
				};

				await pong.canvas.openNode('Character Text Splitter');

				await expect(pong.ndv.getOutputRunSelector()).toBeVisible();
				await expect(pong.ndv.getInputRunSelector()).toBeVisible();
				await expect(pong.ndv.getInputRunSelectorInput()).toHaveValue('3 of 3');
				await expect(pong.ndv.getOutputRunSelectorInput()).toHaveValue('3 of 3');
				await assertInputOutputTextExists('Kyiv');
				await assertInputOutputTextNotExists('Berlin');
				await assertInputOutputTextNotExists('Prague');

				await pong.ndv.changeOutputRunSelector('2 of 3');
				await assertInputOutputTextExists('Berlin');
				await assertInputOutputTextNotExists('Kyiv');
				await assertInputOutputTextNotExists('Prague');

				await pong.ndv.changeOutputRunSelector('1 of 3');
				await assertInputOutputTextExists('Prague');
				await assertInputOutputTextNotExists('Berlin');
				await assertInputOutputTextNotExists('Kyiv');

				await pong.ndv.toggleInputRunLinking();
				await pong.ndv.changeOutputRunSelector('2 of 3');
				await expect(pong.ndv.getInputRunSelectorInput()).toHaveValue('1 of 3');
				await expect(pong.ndv.getOutputRunSelectorInput()).toHaveValue('2 of 3');
				await expect(pong.ndv.getInputPanel()).toContainText('Prague');
				await expect(pong.ndv.getInputPanel()).not.toContainText('Berlin');

				await expect(pong.ndv.getOutputPanel()).toContainText('Berlin');
				await expect(pong.ndv.getOutputPanel()).not.toContainText('Prague');

				await pong.ndv.toggleInputRunLinking();
				await expect(pong.ndv.getInputRunSelectorInput()).toHaveValue('1 of 3');
				await expect(pong.ndv.getOutputRunSelectorInput()).toHaveValue('1 of 3');
				await assertInputOutputTextExists('Prague');
				await assertInputOutputTextNotExists('Berlin');
				await assertInputOutputTextNotExists('Kyiv');
			});

			test('should execute up to Node 1 when using partial execution', async ({ pong }) => {
				await pong.start.fromImportedWorkflow('Test_workflow_chat_partial_execution.json');
				await pong.canvas.clickZoomToFitButton();

				// Check that chat modal is not initially visible
				await expect(pong.canvas.manualChat.getBody()).toBeHidden();

				// Open Node 1 and execute it
				await pong.canvas.openNode('Node 1');
				await pong.ndv.execute();
				// Chat modal should now be visible
				await expect(pong.canvas.manualChat.getBody()).toBeVisible();

				// Send first message
				await pong.canvas.logsPanel.sendManualChatMessage('Test');
				await expect(pong.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_1');

				// Refresh session
				await pong.canvas.logsPanel.refreshSession();
				await expect(pong.canvas.logsPanel.getManualChatMessages()).not.toBeAttached();

				// Send another message
				await pong.canvas.logsPanel.sendManualChatMessage('Another test');
				await expect(pong.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_3');
				await expect(pong.canvas.getManualChatLatestBotMessage()).toContainText('this_my_field_4');
			});
		});
	},
);
