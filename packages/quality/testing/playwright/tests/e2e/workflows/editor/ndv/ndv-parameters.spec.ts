import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV Parameters',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test.describe('Parameter Hints', () => {
			test('should display parameter hints correctly', async ({ pong }) => {
				await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
				await pong.canvas.openNode('Set1');

				await pong.ndv.getParameterInputField('value').clear();
				await pong.ndv.getParameterInputField('value').fill('=');

				await pong.ndv.getInlineExpressionEditorContent().fill('hello');
				await pong.ndv.getParameterInputField('name').click();
				await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('hello');

				await pong.ndv.getInlineExpressionEditorContent().fill('');
				await pong.ndv.getParameterInputField('name').click();
				await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('[empty]');

				await pong.ndv.getInlineExpressionEditorContent().fill(' test');
				await pong.ndv.getParameterInputField('name').click();
				await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText(' test');

				await pong.ndv.getInlineExpressionEditorContent().fill(' ');
				await pong.ndv.getParameterInputField('name').click();
				await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText(' ');

				await pong.ndv.getInlineExpressionEditorContent().fill('<div></div>');
				await pong.ndv.getParameterInputField('name').click();
				await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('<div></div>');
			});
		});

		test.describe('Remote Options & Network', () => {
			test('should not retrieve remote options when a parameter value changes', async ({ pong }) => {
				let fetchParameterOptionsCallCount = 0;
				await pong.page.route('**/rest/dynamic-node-parameters/options', async (route) => {
					fetchParameterOptionsCallCount++;
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({ data: [] }),
					});
				});

				await pong.canvas.addNode('E2E Test', { action: 'Remote Options' });
				await expect(pong.ndv.container).toBeVisible();

				await pong.ndv.fillFirstAvailableTextParameterMultipleTimes(['test1', 'test2', 'test3']);

				expect(fetchParameterOptionsCallCount).toBe(1);
			});

			test('Should show a notice when remote options cannot be fetched because of missing credentials', async ({
				pong,
			}) => {
				await pong.page.route('**/rest/dynamic-node-parameters/options', async (route) => {
					await route.fulfill({ status: 403 });
				});

				await pong.canvas.addNode('Manual Trigger');
				await pong.canvas.addNode('Notion', { action: 'Update a database page', closeNDV: false });
				await expect(pong.ndv.container).toBeVisible();

				await pong.ndv.addItemToFixedCollection('propertiesUi');
				await expect(
					pong.ndv.getParameterInputWithIssues('propertiesUi.propertyValues[0].key'),
				).toBeVisible();
			});

			test('Should show error state when remote options cannot be fetched', async ({ pong }) => {
				await pong.page.route('**/rest/dynamic-node-parameters/options', async (route) => {
					await route.fulfill({ status: 500 });
				});

				await pong.canvas.addNode('Manual Trigger');
				await pong.canvas.addNode('Notion', { action: 'Update a database page', closeNDV: false });
				await expect(pong.ndv.container).toBeVisible();

				await pong.credentialsComposer.createFromNdv({
					apiKey: 'sk_test_123',
				});
				await pong.ndv.addItemToFixedCollection('propertiesUi');
				await expect(
					pong.ndv.getParameterInputWithIssues('propertiesUi.propertyValues[0].key'),
				).toBeVisible();
			});
		});

		test.describe('Parameter Management - Advanced', () => {
			test('Should clear mismatched collection parameters', async ({ pong }) => {
				await pong.canvas.addNode('Manual Trigger');
				await pong.canvas.addNode('Notion', { action: 'Create a database page', closeNDV: false });
				await expect(pong.ndv.container).toBeVisible();

				await pong.ndv.addItemToFixedCollection('propertiesUi');
				await pong.ndv.changeNodeOperation('Update');

				await expect(pong.ndv.getParameterItemWithText('Currently no items exist')).toBeVisible();
			});

			test('Should keep RLC values after operation change', async ({ pong }) => {
				const TEST_DOC_ID = '1111';

				await pong.canvas.addNode('Manual Trigger');
				await pong.canvas.addNode('Google Sheets', {
					closeNDV: false,
					action: 'Append row in sheet',
				});
				await expect(pong.ndv.container).toBeVisible();

				await pong.ndv.setRLCValue('documentId', TEST_DOC_ID);
				await pong.ndv.changeNodeOperation('Append or Update Row');
				const input = pong.ndv.getResourceLocatorInputField('documentId');
				await expect(input).toHaveValue(TEST_DOC_ID);
			});

			test('Should not clear resource/operation after credential change', async ({ pong }) => {
				await pong.canvas.addNode('Manual Trigger');
				await pong.canvas.addNode('Discord', { closeNDV: false, action: 'Delete a message' });
				await expect(pong.ndv.container).toBeVisible();
				await pong.credentialsComposer.createFromNdv({
					botToken: 'sk_test_123',
				});

				const resourceInput = pong.ndv.getParameterInputField('resource');
				const operationInput = pong.ndv.getParameterInputField('operation');

				await expect(resourceInput).toHaveValue('Message');
				await expect(operationInput).toHaveValue('Delete');
			});
		});

		test.describe('Node Creator Integration', () => {
			test('Should open appropriate node creator after clicking on connection hint link', async ({
				pong,
			}) => {
				const hintMapper = {
					Memory: 'AI Nodes',
					'Output Parser': 'AI Nodes',
					'Token Splitter': 'Document Loaders',
					Tool: 'AI Nodes',
					Embeddings: 'Vector Stores',
					'Vector Store': 'Retrievers',
				};

				await pong.canvas.importWorkflow(
					'open_node_creator_for_connection.json',
					'open_node_creator_for_connection',
				);

				for (const [node, group] of Object.entries(hintMapper)) {
					await pong.canvas.openNode(node);

					await pong.ndv.clickNodeCreatorInsertOneButton();
					await expect(pong.canvas.getNodeCreatorHeader(group)).toBeVisible();
					await pong.page.keyboard.press('Escape');
				}
			});
		});

		test.describe('Expression Editor Features', () => {
			test('should allow selecting item for expressions', async ({ pong }) => {
				await pong.canvas.importWorkflow(
					'schedule-trigger-with-set-nodes.json',
					'My test workflow 2',
				);

				await pong.canvas.openNode('Set');

				await pong.ndv.getAssignmentExpressionToggle('assignments').click();

				const expressionInput = pong.ndv.getInlineExpressionEditorInput();
				await expressionInput.click();
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ $json.input[0].count');

				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('0');

				// Clear any run-data-row hover and wait for the item selector to enable before using it.
				await pong.ndv.moveMouseAwayFromRunData();
				await expect(pong.ndv.getInlineExpressionEditorItemNextButton()).toBeEnabled();

				await pong.ndv.expressionSelectNextItem();
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('1');
				await expect(pong.ndv.getInlineExpressionEditorItemInput()).toHaveValue('1');

				await expect(pong.ndv.getInlineExpressionEditorItemNextButton()).toBeDisabled();

				await pong.ndv.expressionSelectPrevItem();
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('0');
				await expect(pong.ndv.getInlineExpressionEditorItemInput()).toHaveValue('0');
			});
		});
	},
);
