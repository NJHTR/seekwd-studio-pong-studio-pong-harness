import { E2E_TEST_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Resource Mapper',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(E2E_TEST_NODE_NAME, { action: 'Resource Mapping Component' });
		});

		test('should not retrieve list options when required params throw errors', async ({ pong }) => {
			const fieldsContainer = pong.ndv.getResourceMapperFieldsContainer();
			await expect(fieldsContainer).toBeVisible();
			await expect(pong.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			await pong.ndv.activateParameterExpressionEditor('fieldId');
			await pong.ndv.typeInExpressionEditor("{{ $('unknown')");
			await expect(pong.ndv.getInlineExpressionEditorPreview()).toContainText("node doesn't exist");

			await pong.ndv.refreshResourceMapperColumns();

			await expect(pong.ndv.getResourceMapperFieldsContainer()).toHaveCount(0);
		});

		test('should retrieve list options when optional params throw errors', async ({ pong }) => {
			await pong.ndv.activateParameterExpressionEditor('otherField');
			await pong.ndv.typeInExpressionEditor("{{ $('unknown')");
			await expect(pong.ndv.getInlineExpressionEditorPreview()).toContainText("node doesn't exist");

			await pong.ndv.refreshResourceMapperColumns();

			await expect(pong.ndv.getResourceMapperFieldsContainer()).toBeVisible();
			await expect(pong.ndv.getResourceMapperParameterInputs()).toHaveCount(3);
		});

		test('should correctly delete single field', async ({ pong }) => {
			await pong.ndv.fillParameterInputByName('id', '001');
			await pong.ndv.fillParameterInputByName('name', 'John');
			await pong.ndv.fillParameterInputByName('age', '30');
			await pong.ndv.execute();

			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toBeVisible();
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toBeVisible();

			await pong.ndv.getResourceMapperRemoveFieldButton('name').click();
			await pong.ndv.execute();

			await expect(pong.ndv.getParameterInput('id')).toBeVisible();
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(pong.ndv.getParameterInput('age')).toBeVisible();
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toBeVisible();
			await expect(pong.ndv.getParameterInput('name')).toHaveCount(0);
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toHaveCount(
				0,
			);
		});

		test('should correctly delete all fields', async ({ pong }) => {
			await pong.ndv.fillParameterInputByName('id', '001');
			await pong.ndv.fillParameterInputByName('name', 'John');
			await pong.ndv.fillParameterInputByName('age', '30');
			await pong.ndv.execute();

			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toBeVisible();
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toBeVisible();

			await pong.ndv.getResourceMapperColumnsOptionsButton().click();
			await pong.ndv.getResourceMapperRemoveAllFieldsOption().click();
			await pong.ndv.execute();

			await expect(pong.ndv.getParameterInput('id')).toBeVisible();
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(pong.ndv.getParameterInput('name')).toHaveCount(0);
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toHaveCount(
				0,
			);
			await expect(pong.ndv.getParameterInput('age')).toHaveCount(0);
			await expect(pong.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toHaveCount(0);
		});
	},
);

test.describe(
	'Resource Mapper values persistence during node navigation',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test('should preserve resource mapper values when navigating between connected nodes via floating nodes', async ({
			pong,
		}) => {
			await pong.start.fromBlankCanvas();

			// Add first E2E Test node with Resource Mapping Component
			await pong.canvas.addNode(E2E_TEST_NODE_NAME, {
				action: 'Resource Mapping Component',
			});

			// Set a unique fieldId so dependentParametersValues differs between nodes
			await pong.ndv.setupHelper.setParameter('fieldId', 'table1');

			// Wait for resource mapper fields to reload after fieldId change
			await expect(pong.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Fill resource mapper values on first node
			await pong.ndv.fillParameterInputByName('id', '001');
			await pong.ndv.fillParameterInputByName('name', 'John');
			await pong.ndv.waitForDebounce();

			// Close NDV
			await pong.ndv.close();

			// Add second E2E Test node connected from the first
			await pong.canvas.addNode(E2E_TEST_NODE_NAME, {
				action: 'Resource Mapping Component',
				fromNode: 'E2E Test',
			});

			// Set a different fieldId to trigger dependentParametersValues change on navigation
			await pong.ndv.setupHelper.setParameter('fieldId', 'table2');

			// Wait for resource mapper fields to reload
			await expect(pong.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Fill resource mapper values on second node
			await pong.ndv.fillParameterInputByName('id', '002');
			await pong.ndv.fillParameterInputByName('name', 'Jane');
			await pong.ndv.waitForDebounce();

			// Navigate to previous node (first E2E Test) using floating node navigation
			await pong.ndv.clickFloatingNodeByPosition('inputMain');

			// Wait for navigation to complete by checking node-specific field value
			await expect(pong.ndv.getParameterInputField('fieldId')).toHaveValue('table1');
			await expect(pong.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Verify first node's resource mapper values are preserved
			await expect(pong.ndv.getParameterInputField('id')).toHaveValue('001');
			await expect(pong.ndv.getParameterInputField('name')).toHaveValue('John');

			// Navigate to next node (second E2E Test)
			await pong.ndv.clickFloatingNodeByPosition('outputMain');

			// Wait for navigation to complete by checking node-specific field value
			await expect(pong.ndv.getParameterInputField('fieldId')).toHaveValue('table2');
			await expect(pong.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Verify second node's resource mapper values are preserved
			await expect(pong.ndv.getParameterInputField('id')).toHaveValue('002');
			await expect(pong.ndv.getParameterInputField('name')).toHaveValue('Jane');
		});
	},
);
