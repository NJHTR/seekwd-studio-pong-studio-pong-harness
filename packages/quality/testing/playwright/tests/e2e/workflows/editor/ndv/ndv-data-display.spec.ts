import { test, expect } from '../../../../../fixtures/base';
import type { pongPage } from '../../../../../pages/pongPage';

test.describe(
	'NDV Data Display',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.describe('Schema View', () => {
			const schemaKeys = [
				'id',
				'name',
				'email',
				'notes',
				'country',
				'created',
				'objectValue',
				'prop1',
				'prop2',
			];

			const setupSchemaWorkflow = async (pong: pongPage) => {
				await pong.start.fromImportedWorkflow('Test_workflow_schema_test.json');
				await pong.canvas.clickZoomToFitButton();
				await pong.canvas.openNode('Set');
				await pong.ndv.execute();
			};

			test('should switch to output schema view and validate it', async ({ pong }) => {
				await setupSchemaWorkflow(pong);
				await pong.ndv.outputPanel.switchDisplayMode('schema');

				for (const key of schemaKeys) {
					await expect(pong.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
				}
			});

			test('should preserve schema view after execution', async ({ pong }) => {
				await setupSchemaWorkflow(pong);
				await pong.ndv.outputPanel.switchDisplayMode('schema');
				await pong.ndv.execute();

				for (const key of schemaKeys) {
					await expect(pong.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
				}
			});

			test('should collapse and expand nested schema object', async ({ pong }) => {
				await setupSchemaWorkflow(pong);
				const expandedObjectProps = ['prop1', 'prop2'];

				await pong.ndv.outputPanel.switchDisplayMode('schema');

				for (const key of expandedObjectProps) {
					await expect(pong.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
				}

				await pong.ndv.outputPanel.getSchemaItemToggle('objectValue').click();

				for (const key of expandedObjectProps) {
					await expect(pong.ndv.outputPanel.getSchemaItem(key)).not.toBeInViewport();
				}
			});

			test('should not display pagination for schema', async ({ pong }) => {
				await setupSchemaWorkflow(pong);

				await pong.ndv.clickBackToCanvasButton();
				await pong.canvas.deselectAll();
				await pong.canvas.nodeByName('Set').click();
				await pong.canvas.addNode('Customer Datastore (pong training)');

				await pong.canvas.openNode('Customer Datastore (pong training)');

				await pong.ndv.execute();

				await expect(pong.ndv.outputPanel.getItemsCountText('5 items')).toBeVisible();

				await pong.ndv.outputPanel.switchDisplayMode('schema');

				const schemaItemsCount = await pong.ndv.outputPanel.getSchemaItems().count();
				expect(schemaItemsCount).toBeGreaterThan(0);

				await pong.ndv.outputPanel.switchDisplayMode('json');
			});

			test('should display large schema', async ({ pong }) => {
				await pong.start.fromImportedWorkflow('Test_workflow_schema_test_pinned_data.json');
				await pong.canvas.clickZoomToFitButton();
				await pong.canvas.openNode('Set');

				// 26 items with page size 25 = 2 pages, so pagination is visible
				await expect(pong.ndv.outputPanel.getItemsCountText('26 items')).toBeVisible();
				await expect(pong.ndv.outputPanel.getPagination()).toBeVisible();

				await pong.ndv.outputPanel.switchDisplayMode('schema');

				await expect(pong.ndv.outputPanel.getPagination()).toBeHidden();
			});
		});

		test.describe('Search and Rendering', () => {
			test('should keep search expanded after Execute step node run', async ({ pong }) => {
				await pong.start.fromImportedWorkflow('Test_ndv_search.json');
				await pong.canvas.clickZoomToFitButton();
				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await pong.canvas.openNode('Edit Fields');
				await expect(pong.ndv.outputPanel.get()).toBeVisible();

				await pong.ndv.searchOutputData('US');

				await expect(pong.ndv.outputPanel.getTableRowHighlights(1)).toContainText('US');

				await pong.ndv.execute();

				await expect(pong.ndv.outputPanel.getSearchInput()).toBeVisible();
				await expect(pong.ndv.outputPanel.getSearchInput()).toHaveValue('US');
			});

			test('Should render xml and html tags as strings and can search', async ({ pong }) => {
				await pong.start.fromImportedWorkflow('Test_workflow_xml_output.json');
				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);
				await pong.canvas.openNode('Edit Fields');

				await expect(pong.ndv.outputPanel.getActiveDisplayMode()).toContainText('Table');

				await expect(pong.ndv.outputPanel.getTableRow(1)).toContainText(
					'<?xml version="1.0" encoding="UTF-8"?> <library>',
				);

				await pong.page.keyboard.press('/');

				const searchInput = pong.ndv.outputPanel.getSearchInput();
				await expect(searchInput).toBeFocused();
				await searchInput.fill('<lib');

				await expect(pong.ndv.outputPanel.getTableRowHighlights(1)).toContainText('<lib');

				await pong.ndv.outputPanel.switchDisplayMode('json');

				await expect(pong.ndv.outputPanel.getJsonDataContainer()).toBeVisible();
			});
		});

		test.describe('Run Data & Selectors', () => {
			test('can link and unlink run selectors between input and output', async ({ pong }) => {
				await pong.start.fromImportedWorkflow('multi-branch-data-transform.json');
				await pong.canvas.clickZoomToFitButton();
				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
					{ timeout: 15000 },
				);
				await pong.canvas.openNode('Set3');

				await pong.ndv.inputPanel.switchDisplayMode('table');
				await pong.ndv.outputPanel.switchDisplayMode('table');

				await pong.ndv.ensureOutputRunLinking(true);
				await pong.ndv.inputPanel.getTbodyCell(0, 0).click();
				await pong.ndv.expectInputRunSelectorValue('2 of 2 (6 items)');
				await pong.ndv.expectOutputRunSelectorValue('2 of 2 (6 items)');

				await pong.ndv.changeOutputRunSelector('1 of 2 (6 items)');
				await pong.ndv.expectInputRunSelectorValue('1 of 2 (6 items)');
				await expect(pong.ndv.inputPanel.getTbodyCell(0, 0)).toHaveText('1111');
				await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('1111');

				await pong.ndv.inputPanel.getTbodyCell(0, 0).click();
				await pong.ndv.changeInputRunSelector('2 of 2 (6 items)');
				await pong.ndv.expectOutputRunSelectorValue('2 of 2 (6 items)');

				await pong.ndv.outputPanel.getLinkRun().click();
				await pong.ndv.inputPanel.getTbodyCell(0, 0).click();
				await pong.ndv.changeOutputRunSelector('1 of 2 (6 items)');
				await pong.ndv.expectInputRunSelectorValue('2 of 2 (6 items)');

				await pong.ndv.outputPanel.getLinkRun().click();
				await pong.ndv.inputPanel.getTbodyCell(0, 0).click();
				await pong.ndv.expectInputRunSelectorValue('1 of 2 (6 items)');

				await pong.ndv.inputPanel.toggleInputRunLinking();
				await pong.ndv.inputPanel.getTbodyCell(0, 0).click();
				await pong.ndv.changeInputRunSelector('2 of 2 (6 items)');
				await pong.ndv.expectOutputRunSelectorValue('1 of 2 (6 items)');

				await pong.ndv.inputPanel.toggleInputRunLinking();
				await pong.ndv.inputPanel.getTbodyCell(0, 0).click();
				await pong.ndv.expectOutputRunSelectorValue('2 of 2 (6 items)');
			});
		});

		test.describe('Schema & Data Views', () => {
			test('should show data from the correct output in schema view', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.importWorkflow('Test_workflow_multiple_outputs.json', 'Multiple outputs');
				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
				);

				await pong.canvas.openNode('Only Item 1');
				await expect(pong.ndv.inputPanel.get()).toBeVisible();
				await pong.ndv.inputPanel.switchDisplayMode('schema');
				await expect(pong.ndv.inputPanel.getSchemaItem('onlyOnItem1')).toBeVisible();
				await pong.ndv.close();

				await pong.canvas.openNode('Only Item 2');
				await expect(pong.ndv.inputPanel.get()).toBeVisible();
				await pong.ndv.inputPanel.switchDisplayMode('schema');
				await expect(pong.ndv.inputPanel.getSchemaItem('onlyOnItem2')).toBeVisible();
				await pong.ndv.close();

				await pong.canvas.openNode('Only Item 3');
				await expect(pong.ndv.inputPanel.get()).toBeVisible();
				await pong.ndv.inputPanel.switchDisplayMode('schema');
				await expect(pong.ndv.inputPanel.getSchemaItem('onlyOnItem3')).toBeVisible();
				await pong.ndv.close();
			});
		});

		test.describe('Search Functionality - Advanced', () => {
			test('should not show items count when searching in schema view', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.importWorkflow('Test_ndv_search.json', 'NDV Search Test');
				await pong.canvas.openNode('Edit Fields');
				await expect(pong.ndv.outputPanel.get()).toBeVisible();

				await pong.ndv.execute();
				await pong.ndv.outputPanel.switchDisplayMode('schema');
				await pong.ndv.searchOutputData('US');

				await expect(pong.ndv.outputPanel.getItemsCount()).toBeHidden();
			});

			test('should show additional tooltip when searching in schema view if no matches', async ({
				pong,
			}) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.importWorkflow('Test_ndv_search.json', 'NDV Search Test');

				await pong.canvas.openNode('Edit Fields');
				await expect(pong.ndv.outputPanel.get()).toBeVisible();

				await pong.ndv.execute();
				await pong.ndv.outputPanel.switchDisplayMode('schema');
				await pong.ndv.searchOutputData('foo');

				await expect(
					pong.ndv.outputPanel.getBranchTab('To search field values, switch to table or JSON view.'),
				).toBeVisible();
			});
		});
	},
);
