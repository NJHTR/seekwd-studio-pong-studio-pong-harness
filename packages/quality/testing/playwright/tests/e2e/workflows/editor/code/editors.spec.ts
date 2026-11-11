import fs from 'fs';

import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';

test.describe(
	'Editors',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addInitialNodeToCanvas('Manual Trigger');
		});

		test.describe('SQL Editor', () => {
			test('should preserve changes when opening-closing Postgres node', async ({ pong }) => {
				await pong.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

				const sqlEditor = pong.ndv.getParameterEditor('query');
				await sqlEditor.click();
				await sqlEditor.fill('SELECT * FROM `testTable`');
				await pong.page.keyboard.press('Escape');

				await pong.ndv.close();
				await pong.canvas.openNode('Execute a SQL query');

				await sqlEditor.click();
				await sqlEditor.press('End');
				await sqlEditor.pressSequentially(' LIMIT 10');
				await pong.page.keyboard.press('Escape');

				await pong.ndv.close();
				await pong.canvas.openNode('Execute a SQL query');

				await expect(sqlEditor).toContainText('SELECT * FROM `testTable` LIMIT 10');
			});

			test('should update expression output dropdown as the query is edited', async ({ pong }) => {
				await pong.canvas.addNode('MySQL', { action: 'Execute a SQL query', closeNDV: true });

				await pong.canvas.openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
				await pong.ndv.setPinnedData([{ table: 'test_table' }]);
				await pong.ndv.close();

				await pong.canvas.openNode('Execute a SQL query');

				const sqlEditor = pong.ndv.getParameterEditor('query');
				await sqlEditor.click();
				await sqlEditor.fill('SELECT * FROM {{ $json.table }}');

				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText(
					'SELECT * FROM test_table',
				);
			});

			test('should not push NDV header out with a lot of code in Postgres editor', async ({
				pong,
			}) => {
				await pong.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

				const dummyCode = fs.readFileSync(
					resolveFromRoot('fixtures', 'Dummy_javascript.txt'),
					'utf8',
				);

				const sqlEditor = pong.ndv.getParameterEditor('query');
				await sqlEditor.click();

				await pong.clipboard.paste(dummyCode);

				await expect(pong.ndv.getExecuteNodeButton()).toBeVisible();
			});

			test('should not push NDV header out with a lot of code in MySQL editor', async ({ pong }) => {
				await pong.canvas.addNode('MySQL', { action: 'Execute a SQL query' });

				const dummyCode = fs.readFileSync(
					resolveFromRoot('fixtures', 'Dummy_javascript.txt'),
					'utf8',
				);

				const sqlEditor = pong.ndv.getParameterEditor('query');
				await sqlEditor.click();
				await pong.clipboard.paste(dummyCode);

				await expect(pong.ndv.getExecuteNodeButton()).toBeVisible();
			});

			test('should not trigger dirty flag if nothing is changed', async ({ pong }) => {
				await pong.canvas.addNode('Postgres', { action: 'Execute a SQL query' });
				await pong.ndv.close();

				await pong.canvas.waitForSaveWorkflowCompleted();

				await pong.canvas.openNode('Execute a SQL query');
				await pong.ndv.close();

				await expect(pong.canvas.waitForSaveWorkflowCompleted()).rejects.toThrow();
			});

			test('should trigger dirty flag if query is updated', async ({ pong }) => {
				await pong.canvas.addNode('Postgres', { action: 'Execute a SQL query' });
				await pong.ndv.close();

				await pong.canvas.waitForSaveWorkflowCompleted();

				await pong.canvas.openNode('Execute a SQL query');

				const sqlEditor = pong.ndv.getParameterEditor('query');
				await sqlEditor.click();
				await sqlEditor.fill('SELECT * FROM `testTable`');
				await pong.page.keyboard.press('Escape');

				await pong.ndv.close();

				await pong.canvas.waitForSaveWorkflowCompleted();
			});

			test('should allow switching between SQL editors in connected nodes', async ({ pong }) => {
				await pong.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

				const sqlEditor = pong.ndv.getParameterEditor('query');
				await sqlEditor.click();
				await pong.clipboard.paste('SELECT * FROM `firstTable`');

				await pong.ndv.close();

				await pong.canvas.addNode('Postgres', { action: 'Execute a SQL query' });

				await sqlEditor.click();
				await pong.clipboard.paste('SELECT * FROM `secondTable`');

				await pong.ndv.close();

				await pong.canvas.openNode('Execute a SQL query');

				await pong.ndv.clickFloatingNode('Execute a SQL query1');
				await expect(sqlEditor).toHaveText('SELECT * FROM `secondTable`');

				await pong.ndv.clickFloatingNode('Execute a SQL query');
				await expect(sqlEditor).toHaveText('SELECT * FROM `firstTable`');
			});
		});

		test.describe('HTML Editor', () => {
			const TEST_ELEMENT_H1 = '<h1>Test</h1>';
			const TEST_ELEMENT_P = '<p>Test</p>';

			test('should preserve changes when opening-closing HTML node', async ({ pong }) => {
				await pong.canvas.addNode('HTML', { action: 'Generate HTML template' });

				const htmlEditor = pong.ndv.getParameterEditor('html');
				await htmlEditor.click();
				await htmlEditor.press('ControlOrMeta+A');
				await htmlEditor.fill(TEST_ELEMENT_H1);
				await pong.page.keyboard.press('Escape');

				await pong.ndv.close();
				await pong.canvas.openNode('HTML');

				await htmlEditor.click();
				await htmlEditor.press('End');
				await htmlEditor.pressSequentially(TEST_ELEMENT_P);
				await pong.page.keyboard.press('Escape');

				await pong.ndv.close();
				await pong.canvas.openNode('HTML');

				await expect(htmlEditor).toContainText(TEST_ELEMENT_H1);
				await expect(htmlEditor).toContainText(TEST_ELEMENT_P);
			});

			test('should not trigger dirty flag if nothing is changed', async ({ pong }) => {
				await pong.canvas.addNode('HTML', { action: 'Generate HTML template' });
				await pong.ndv.close();

				await pong.canvas.waitForSaveWorkflowCompleted();

				await pong.canvas.openNode('HTML');
				await pong.ndv.close();

				await expect(pong.canvas.waitForSaveWorkflowCompleted()).rejects.toThrow();
			});

			test('should trigger dirty flag if query is updated', async ({ pong }) => {
				await pong.canvas.addNode('HTML', { action: 'Generate HTML template' });
				await pong.ndv.close();

				await pong.canvas.waitForSaveWorkflowCompleted();

				await pong.canvas.openNode('HTML');

				const htmlEditor = pong.ndv.getParameterEditor('html');
				await htmlEditor.click();
				await htmlEditor.press('ControlOrMeta+A');
				await htmlEditor.fill(TEST_ELEMENT_H1);
				await pong.page.keyboard.press('Escape');

				await pong.ndv.close();

				await pong.canvas.waitForSaveWorkflowCompleted();
			});

			test('should allow switching between HTML editors in connected nodes', async ({ pong }) => {
				await pong.canvas.addNode('HTML', { action: 'Generate HTML template' });

				const htmlEditor = pong.ndv.getParameterEditor('html');
				await htmlEditor.click();
				await htmlEditor.press('ControlOrMeta+A');
				await pong.clipboard.paste('<div>First</div>');

				await pong.ndv.close();

				await pong.canvas.addNode('HTML', { action: 'Generate HTML template' });

				await htmlEditor.click();
				await htmlEditor.press('ControlOrMeta+A');
				await pong.clipboard.paste('<div>Second</div>');

				await pong.ndv.close();

				await pong.canvas.openNode('HTML');

				await pong.ndv.clickFloatingNode('HTML1');
				await expect(htmlEditor).toHaveText('<div>Second</div>');

				await pong.ndv.clickFloatingNode('HTML');
				await expect(htmlEditor).toHaveText('<div>First</div>');
			});
		});
	},
);
