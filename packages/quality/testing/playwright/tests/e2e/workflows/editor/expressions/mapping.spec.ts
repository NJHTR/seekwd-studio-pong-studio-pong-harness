import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Data Mapping',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.describe
			.serial('Expression Preview', () => {
				test('maps expressions from table json, and resolves value based on hover', async ({
					pong,
				}) => {
					// This test is marked as serial because hover/tooltips are unreliable when running in parallel against a single server due to resource contention.

					await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
					await pong.canvas.openNode('Set');
					await pong.ndv.inputPanel.switchDisplayMode('table');

					await expect(pong.ndv.inputPanel.getTable()).toBeVisible();

					await expect(pong.ndv.getParameterInputField('name')).toHaveValue('other');
					await expect(pong.ndv.getParameterInputField('value')).toHaveValue('');

					const countCell = pong.ndv.inputPanel.getTableCellSpan(0, 0, 'count');
					await expect(countCell).toBeVisible();

					const valueParameter = pong.ndv.getParameterInput('value');
					await pong.interactions.precisionDragToTarget(countCell, valueParameter, 'bottom');

					await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
						'{{ $json.input[0].count }}',
					);
					await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('0');

					await pong.ndv.inputPanel.getTbodyCell(0, 0).hover();
					await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('0');

					await pong.ndv.inputPanel.getTbodyCell(1, 0).hover();
					await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('1');

					await pong.ndv.execute();

					await expect(pong.ndv.outputPanel.getTable()).toBeVisible();

					await pong.ndv.outputPanel.getTbodyCell(0, 0).hover();
					await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('0');

					await pong.ndv.outputPanel.getTbodyCell(1, 0).hover();
					await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('1');
				});
			});
		test('maps expressions from json view', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
			await pong.canvas.openNode('Set');
			await pong.ndv.inputPanel.switchDisplayMode('json');

			const expectedJsonText =
				'[  {    "input": [      {        "count": 0,        "with space": "!!",        "with.dot": "!!",        "with"quotes": "!!"      }    ]  },  {    "input": [      {        "count": 1      }    ]  }]';
			await expect(async () => {
				await expect(pong.ndv.inputPanel.getJsonDataContainer()).toContainText(expectedJsonText);
			}).toPass({ timeout: 1000 });

			await expect(pong.ndv.inputPanel.getJsonDataContainer()).toBeVisible();

			const inputSpan = pong.ndv.inputPanel.getJsonProperty('input');
			await expect(inputSpan).toBeVisible();

			const valueParameterInput = pong.ndv.getParameterInput('value');
			await expect(valueParameterInput).toBeVisible();

			await inputSpan.dragTo(valueParameterInput);

			const expressionEditor = pong.ndv.getInlineExpressionEditorInput();
			await expect(expressionEditor).toBeVisible();
			await expect(expressionEditor).toHaveText('{{ $json.input }}');

			await pong.page.keyboard.press('Escape');

			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('Array:');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('"count": 0');

			const countSpan = pong.ndv.inputPanel.getJsonPropertyContaining('count');
			await expect(countSpan).toBeVisible();

			await pong.interactions.precisionDragToTarget(
				countSpan,
				pong.ndv.getInlineExpressionEditorInput(),
				'bottom',
			);

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				'{{ $json.input }}{{ $json.input[0].count }}',
			);

			await pong.page.keyboard.press('Escape');

			const previewElement = pong.ndv.getParameterExpressionPreviewValue();
			await expect(previewElement).toBeVisible();
		});

		test('maps expressions from previous nodes', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
			await pong.canvas.openNode('Set1');
			await pong.ndv.executePrevious();

			const scheduleNode = pong.ndv.inputPanel.getBranchTab('Schedule Trigger');
			await expect(scheduleNode).toBeVisible();
			await scheduleNode.click();

			const schemaItem = pong.ndv.inputPanel.getSchemaItemText('count');
			await expect(schemaItem).toBeVisible();

			const valueParameterInput = pong.ndv.getParameterInput('value');
			await expect(valueParameterInput).toBeVisible();

			await pong.interactions.precisionDragToTarget(
				pong.ndv.inputPanel.getSchemaItemPill('count'),
				valueParameterInput,
				'top',
			);

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				"{{ $('Schedule Trigger').item.json.input[0].count }}",
			);

			await pong.page.keyboard.press('Escape');

			await pong.ndv.inputPanel.switchDisplayMode('table');
			await pong.ndv.selectInputNode('Schedule Trigger');

			const headerElement = pong.ndv.inputPanel.getTableHeader(0);
			await expect(headerElement).toBeVisible();

			await pong.interactions.precisionDragToTarget(
				headerElement,
				pong.ndv.getInlineExpressionEditorInput(),
				'top',
			);

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				"{{ $('Schedule Trigger').item.json.input }}{{ $('Schedule Trigger').item.json.input[0].count }}",
			);

			await pong.ndv.selectInputNode('Set');
		});
		test('maps expressions from table header', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow-actions_paste-data.json');
			await pong.canvas.openNode('Set');
			await pong.ndv.executePrevious();
			await pong.ndv.inputPanel.switchDisplayMode('table');

			await expect(pong.ndv.inputPanel.getTable()).toBeVisible();

			const addValueButton = pong.ndv.getAddValueButton();
			await expect(addValueButton).toBeVisible();
			await addValueButton.click();

			await pong.ndv.selectFromVisibleDropdown('String');

			await expect(pong.ndv.getParameterInputField('name')).toHaveValue('propertyName');
			await expect(pong.ndv.getParameterInputField('value')).toHaveValue('');

			const firstHeader = pong.ndv.inputPanel.getTableHeader(0);
			await expect(firstHeader).toBeVisible();

			const valueParameter = pong.ndv.getParameterInput('value');
			await pong.interactions.precisionDragToTarget(firstHeader, valueParameter, 'center');

			// Wait for expression editor to appear after drop
			await expect(pong.ndv.getInlineExpressionEditorInput()).toBeVisible({ timeout: 15000 });
			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText('{{ $json.timestamp }}');

			await pong.page.keyboard.press('Escape');

			const currentYear = new Date().getFullYear().toString();
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText(currentYear);

			const secondHeader = pong.ndv.inputPanel.getTableHeader(1);
			await expect(secondHeader).toBeVisible();

			await pong.interactions.precisionDragToTarget(
				secondHeader,
				pong.ndv.getInlineExpressionEditorInput(),
				'top',
			);

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				"{{ $json['Readable date'] }}{{ $json.timestamp }}",
			);
		});

		test('maps expressions from schema view', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
			await pong.canvas.openNode('Set');

			await pong.ndv.getParameterInputField('value').clear();
			await pong.page.keyboard.press('Escape');

			const countSchemaItem = pong.ndv.inputPanel.getSchemaItemText('count');
			await expect(countSchemaItem).toBeVisible();

			const valueParameter = pong.ndv.getParameterInput('value');
			await pong.interactions.precisionDragToTarget(countSchemaItem, valueParameter, 'bottom');

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				'{{ $json.input[0].count }}',
			);
			await pong.page.keyboard.press('Escape');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('0');

			const inputSchemaItem = pong.ndv.inputPanel.getSchemaItemText('input');
			await expect(inputSchemaItem).toBeVisible();

			await pong.interactions.precisionDragToTarget(inputSchemaItem, valueParameter, 'top');

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				'{{ $json.input }}{{ $json.input[0].count }}',
			);
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('[object Object]0');
		});

		test('maps keys to path', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.openNode('When clicking ‘Execute workflow’');

			await pong.ndv.setPinnedData([
				{
					input: [
						{
							'hello.world': {
								'my count': 0,
							},
						},
					],
				},
				{
					input: [
						{
							'hello.world': {
								'my count': 1,
							},
						},
					],
				},
			]);

			await pong.ndv.close();

			await pong.canvas.addNode('Sort');

			const addFieldButton = pong.ndv.getAddFieldToSortByButton();
			await addFieldButton.click();

			const myCountSpan = pong.ndv.inputPanel.getSchemaItemText('my count');
			await expect(myCountSpan).toBeVisible();

			const fieldNameParameter = pong.ndv.getParameterInput('fieldName');
			await pong.interactions.precisionDragToTarget(myCountSpan, fieldNameParameter, 'bottom');

			await expect(pong.ndv.getInlineExpressionEditorInput()).toBeHidden();
			await expect(pong.ndv.getParameterInputField('fieldName')).toHaveValue(
				"input[0]['hello.world']['my count']",
			);
		});

		test.fixme('maps expressions to updated fields correctly', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
			await pong.canvas.openNode('Set');

			await pong.ndv.fillParameterInputByName('value', 'delete me');
			await pong.ndv.fillParameterInputByName('name', 'test');
			await pong.ndv.getParameterInputField('name').blur();

			await pong.ndv.fillParameterInputByName('value', 'fun');
			await pong.ndv.getParameterInputField('value').clear();

			const countSchemaItem = pong.ndv.inputPanel.getSchemaItemText('count');
			await expect(countSchemaItem).toBeVisible();

			const valueParameter = pong.ndv.getParameterInput('value');
			await pong.interactions.precisionDragToTarget(countSchemaItem, valueParameter, 'bottom');

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				'{{ $json.input[0].count }}',
			);
			await pong.page.keyboard.press('Escape');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('0');

			const inputSchemaItem = pong.ndv.inputPanel.getSchemaItemText('input');
			await expect(inputSchemaItem).toBeVisible();

			await pong.interactions.precisionDragToTarget(inputSchemaItem, valueParameter, 'top');

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				'{{ $json.input }}{{ $json.input[0].count }}',
			);
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('[object Object]0');
		});

		test('renders expression preview when a previous node is selected', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
			await pong.canvas.openNode('Set');

			await pong.ndv.fillParameterInputByName('value', 'test_value');
			await pong.ndv.fillParameterInputByName('name', 'test_name');
			await pong.ndv.close();

			await pong.canvas.openNode('Set1');
			await pong.ndv.executePrevious();
			await pong.ndv.inputPanel.switchDisplayMode('table');

			const firstHeader = pong.ndv.inputPanel.getTableHeader(0);
			await expect(firstHeader).toBeVisible();

			const valueParameter = pong.ndv.getParameterInput('value');
			await pong.interactions.precisionDragToTarget(firstHeader, valueParameter, 'bottom');

			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('test_value');

			await pong.ndv.selectInputNode('Schedule Trigger');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText('test_value');
		});

		test('shows you can drop to inputs, including booleans', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
			await pong.canvas.openNode('Set');

			await expect(pong.ndv.getParameterSwitch('includeOtherFields')).toBeVisible();
			await expect(pong.ndv.getParameterTextInput('includeOtherFields')).toBeHidden();

			const countSpan = pong.ndv.inputPanel.getSchemaItemText('count');
			await expect(countSpan).toBeVisible();

			await countSpan.hover();
			await pong.page.mouse.down();
			await pong.page.mouse.move(100, 100);

			await expect(pong.ndv.getParameterSwitch('includeOtherFields')).toBeHidden();
			await expect(pong.ndv.getParameterTextInput('includeOtherFields')).toBeVisible();

			// Check droppable state on parameter inputs
			const includeOtherFieldsInput = pong.ndv.getParameterInput('includeOtherFields');
			await expect(includeOtherFieldsInput).toHaveClass(/droppable/);

			const valueInput = pong.ndv.getParameterInput('value');
			await expect(valueInput).toHaveClass(/droppable/);

			await pong.page.mouse.up();
		});

		test('maps expressions to a specific location in the editor', async ({ pong }) => {
			await pong.start.fromImportedWorkflow('schedule-trigger-with-set-nodes.json');
			await pong.canvas.openNode('Set');

			await pong.ndv.fillParameterInputByName('value', '=');
			await pong.ndv.getInlineExpressionEditorContent().fill('hello world\n\nnewline');
			await pong.page.keyboard.press('Escape');

			const countSchemaItem = pong.ndv.inputPanel.getSchemaItemText('count');
			await expect(countSchemaItem).toBeVisible();

			const valueParameter = pong.ndv.getParameterInput('value');
			await pong.interactions.precisionDragToTarget(countSchemaItem, valueParameter, 'top');

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				'{{ $json.input[0].count }}hello worldnewline',
			);
			await pong.page.keyboard.press('Escape');
			await expect(pong.ndv.getParameterExpressionPreviewValue()).toContainText(
				'0hello world\n\nnewline',
			);

			const inputSchemaItem = pong.ndv.inputPanel.getSchemaItemText('input');
			await expect(inputSchemaItem).toBeVisible();

			await pong.interactions.precisionDragToTarget(inputSchemaItem, valueParameter, 'center');

			await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText(
				'{{ $json.input[0].count }}hello world{{ $json.input }}newline',
			);
		});
	},
);
