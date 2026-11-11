import { customAlphabet } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

const generateValidId = customAlphabet(
	'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
	8,
);

test.describe(
	'Variables',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		// These tests are serial since it's at an instance level and they interact with the same variables
		test.describe.configure({ mode: 'serial' });
		test.describe('unlicensed', () => {
			test('should show the unlicensed action box when the feature is disabled', async ({
				pong,
			}) => {
				await pong.api.disableFeature('variables');
				await pong.navigate.toVariables();
				await expect(pong.variables.getUnavailableResourcesList()).toBeVisible();
				await expect(pong.variables.getResourcesList()).toBeHidden();
			});
		});

		test.describe('licensed', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.api.enableFeature('variables');
				await pong.api.variables.deleteAllVariables();
				await pong.navigate.toVariables();
			});

			test('should create a new variable using empty state', async ({ pong }) => {
				const key = `ENV_VAR_${generateValidId()}`;
				const value = 'test_value';

				await pong.variables.createVariableFromEmptyState(key, value);

				const variableRow = pong.variables.getVariableRow(key);
				await expect(variableRow).toContainText(value);
				await expect(variableRow).toBeVisible();
				await expect(pong.variables.getVariablesRows()).toHaveCount(1);
			});

			test('should create multiple variables', async ({ pong }) => {
				const key1 = `ENV_VAR_NEW_${generateValidId()}`;
				const value1 = 'test_value_1';
				await pong.variables.createVariableFromEmptyState(key1, value1);
				await expect(pong.variables.getVariablesRows()).toHaveCount(1);

				const key2 = `ENV_EXAMPLE_${generateValidId()}`;
				const value2 = 'test_value_2';
				await pong.variables.createVariable(key2, value2);

				await expect(pong.variables.getVariablesRows()).toHaveCount(2);

				const variableRow1 = pong.variables.getVariableRow(key1);
				await expect(variableRow1).toContainText(value1);
				await expect(variableRow1).toBeVisible();

				const variableRow2 = pong.variables.getVariableRow(key2);
				await expect(variableRow2).toContainText(value2);
				await expect(variableRow2).toBeVisible();
			});

			test('should get validation errors and cancel variable creation', async ({ pong }) => {
				await pong.variables.createVariableFromEmptyState(
					`ENV_BASE_${generateValidId()}`,
					'base_value',
				);
				await expect(pong.variables.getVariablesRows()).toHaveCount(1);
				const initialCount = await pong.variables.getVariablesRows().count();

				const key = `ENV_VAR_INVALID_${generateValidId()}$`; // Invalid key with special character
				const value = 'test_value';

				await pong.variables.createVariable(key, value, { shouldSave: false });
				const saveButton = pong.variables.variableModal.getSaveButton();
				await expect(saveButton).toBeDisabled();
				await pong.variables.variableModal.close();

				await expect(pong.variables.getVariablesRows()).toHaveCount(initialCount);
			});

			test('should edit a variable', async ({ pong }) => {
				const key = `ENV_VAR_EDIT_${generateValidId()}`;
				const initialValue = 'initial_value';
				await pong.variables.createVariableFromEmptyState(key, initialValue);

				const newValue = 'updated_value';

				await pong.variables.editVariable(key, newValue, { shouldSave: true });

				const variableRow = pong.variables.getVariableRow(key);
				await expect(variableRow).toContainText(newValue);
				await expect(variableRow).toBeVisible();
			});

			test('should delete a variable', async ({ pong }) => {
				const key = `TO_DELETE_${generateValidId()}`;
				const value = 'delete_test_value';

				await pong.variables.createVariableFromEmptyState(key, value);
				await expect(pong.variables.getVariablesRows()).toHaveCount(1);
				const initialCount = await pong.variables.getVariablesRows().count();

				await pong.variables.deleteVariable(key);

				await expect(pong.variables.getVariablesRows()).toHaveCount(initialCount - 1);

				await expect(pong.variables.getVariableRow(key)).toBeHidden();
			});

			test('should search for a variable', async ({ pong }) => {
				const uniqueId = generateValidId();

				const key1 = `SEARCH_VAR_${uniqueId}`;
				const key2 = `SEARCH_VAR_NEW_${uniqueId}`;
				const key3 = `SEARCH_EXAMPLE_${uniqueId}`;

				await pong.variables.createVariableFromEmptyState(key1, 'search_value_1');
				await pong.variables.createVariable(key2, 'search_value_2');
				await pong.variables.createVariable(key3, 'search_value_3');

				await pong.variables.getSearchBar().fill('NEW_');
				await pong.variables.getSearchBar().press('Enter');
				await expect(pong.variables.getVariablesRows()).toHaveCount(1);
				await expect(pong.variables.getVariableRow(key2)).toBeVisible();
				await expect(pong.page).toHaveURL(new RegExp('search=NEW_'));

				await pong.variables.getSearchBar().clear();
				await pong.variables.getSearchBar().fill('SEARCH_VAR_');
				await pong.variables.getSearchBar().press('Enter');
				await expect(pong.variables.getVariablesRows()).toHaveCount(2);
				await expect(pong.variables.getVariableRow(key1)).toBeVisible();
				await expect(pong.variables.getVariableRow(key2)).toBeVisible();
				await expect(pong.page).toHaveURL(new RegExp('search=SEARCH_VAR_'));

				await pong.variables.getSearchBar().clear();
				await pong.variables.getSearchBar().fill('SEARCH_');
				await pong.variables.getSearchBar().press('Enter');
				await expect(pong.variables.getVariablesRows()).toHaveCount(3);
				await expect(pong.variables.getVariableRow(key1)).toBeVisible();
				await expect(pong.variables.getVariableRow(key2)).toBeVisible();
				await expect(pong.variables.getVariableRow(key3)).toBeVisible();
				await expect(pong.page).toHaveURL(new RegExp('search=SEARCH_'));

				await pong.variables.getSearchBar().clear();
				await pong.variables.getSearchBar().fill(`NonExistent_${generateValidId()}`);
				await pong.variables.getSearchBar().press('Enter');
				await expect(pong.variables.getVariablesRows()).toBeHidden();
				await expect(pong.page).toHaveURL(/search=NonExistent_/);

				await expect(pong.variables.getNoVariablesFoundMessage()).toBeVisible();
			});
		});
	},
);
