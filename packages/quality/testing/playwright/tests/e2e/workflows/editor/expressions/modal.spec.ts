import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Expression editor modal',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addInitialNodeToCanvas('Schedule Trigger');
			await pong.ndv.close();
		});

		test.describe('Keybinds', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.canvas.addNode('Hacker News', { action: 'Get many items' });
				await pong.ndv.openExpressionEditorModal('limit');
			});

			test('should save the workflow with save keybind', async ({ pong }) => {
				const input = pong.ndv.getExpressionEditorModalInput();
				await pong.ndv.fillExpressionEditorModalInput('{{ "hello"');
				await expect(pong.ndv.getExpressionEditorModalOutput()).toContainText('hello');

				// There is no save toast any more, so assert on the save request itself
				const saved = pong.canvas.waitForSaveWorkflowCompleted();
				await input.press('ControlOrMeta+s');
				await saved;
			});
		});

		test.describe('Static data', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.canvas.addNode('Hacker News', { action: 'Get many items' });
				await pong.ndv.openExpressionEditorModal('limit');
			});

			test('should resolve primitive resolvables', async ({ pong }) => {
				const output = pong.ndv.getExpressionEditorModalOutput();

				// Test number addition
				await pong.ndv.fillExpressionEditorModalInput('{{ 1 + 2 }}');
				await expect(output).toContainText(/^3$/);

				// Test string concatenation
				await pong.ndv.fillExpressionEditorModalInput('{{ "ab" + "cd" }}');
				await expect(output).toContainText(/^abcd$/);

				// Test boolean logic
				await pong.ndv.fillExpressionEditorModalInput('{{ true && false }}');
				await expect(output).toContainText(/^false$/);
			});

			test('should resolve object resolvables', async ({ pong }) => {
				const output = pong.ndv.getExpressionEditorModalOutput();

				// Test object creation
				await pong.ndv.fillExpressionEditorModalInput('{{ { a : 1 } }}');
				await expect(output).toContainText(/^\[Object: \{"a": 1\}\]$/);

				// Test object property access
				await pong.ndv.fillExpressionEditorModalInput('{{ { a : 1 }.a }}');
				await expect(output).toContainText(/^1$/);
			});

			test('should resolve array resolvables', async ({ pong }) => {
				const output = pong.ndv.getExpressionEditorModalOutput();

				// Test array creation
				await pong.ndv.fillExpressionEditorModalInput('{{ [1, 2, 3] }}');
				await expect(output).toContainText(/^\[Array: \[1,2,3\]\]$/);

				// Test array element access
				await pong.ndv.fillExpressionEditorModalInput('{{ [1, 2, 3][0] }}');
				await expect(output).toContainText(/^1$/);
			});
		});

		test.describe('Dynamic data', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.canvas.openNode('Schedule Trigger');
				await pong.ndv.setPinnedData([{ myStr: 'Monday' }]);
				await pong.ndv.clickBackToCanvasButton();
				await pong.canvas.addNode('No Operation, do nothing', { closeNDV: true });
				await pong.canvas.addNode('Hacker News', { action: 'Get many items' });
				await pong.ndv.openExpressionEditorModal('limit');
			});

			test('should resolve $parameter[]', async ({ pong }) => {
				const output = pong.ndv.getExpressionEditorModalOutput();
				await pong.ndv.fillExpressionEditorModalInput('{{ $parameter["operation"] }}');
				await expect(output).toHaveText('getAll');
			});

			test('should resolve input: $json,$input,$(nodeName)', async ({ pong }) => {
				const output = pong.ndv.getExpressionEditorModalOutput();

				// Previous nodes have not run, input is empty
				await pong.ndv.fillExpressionEditorModalInput('{{ $json.myStr }}');
				await expect(output).toHaveText('[Execute previous nodes for preview]');
				await pong.ndv.fillExpressionEditorModalInput('{{ $input.item.json.myStr }}');
				await expect(output).toHaveText('[Execute previous nodes for preview]');
				await pong.ndv.fillExpressionEditorModalInput("{{ $('Schedule Trigger').item.json.myStr }}");
				await expect(output).toHaveText('[Execute previous nodes for preview]');

				// Run workflow
				await output.click();
				await pong.page.keyboard.press('Escape');
				await pong.ndv.clickBackToCanvasButton();
				await pong.canvas.executeNode('No Operation, do nothing');
				await pong.canvas.openNode('Get many items');
				await pong.ndv.openExpressionEditorModal('limit');

				// Previous nodes have run, input can be resolved
				await pong.ndv.fillExpressionEditorModalInput('{{ $json.myStr }}');
				await expect(output).toHaveText('Monday');
				await pong.ndv.fillExpressionEditorModalInput('{{ $input.item.json.myStr }}');
				await expect(output).toHaveText('Monday');
				await pong.ndv.fillExpressionEditorModalInput("{{ $('Schedule Trigger').item.json.myStr }}");
				await expect(output).toHaveText('Monday');
			});
		});
	},
);
