import {
	EDIT_FIELDS_SET_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
	NO_OPERATION_NODE_NAME,
	HACKER_NEWS_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const SCHEDULE_PARAMETER_NAME = 'daysInterval';
const HACKER_NEWS_ACTION = 'Get many items';
const HACKER_NEWS_PARAMETER_NAME = 'limit';

test.describe(
	'Inline expression editor',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test.describe('Basic UI functionality', () => {
			test('should open and close inline expression preview', async ({ pong }) => {
				await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
				await pong.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);

				await pong.ndv.getInlineExpressionEditorInput(SCHEDULE_PARAMETER_NAME).click();
				await pong.ndv.clearExpressionEditor(SCHEDULE_PARAMETER_NAME);
				await pong.ndv.typeInExpressionEditor('{{ 123', SCHEDULE_PARAMETER_NAME);

				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('123');

				// Click outside to close
				await pong.ndv.outputPanel.get().click();
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toBeHidden();
			});

			test.fixme('should switch between expression and fixed using keyboard', async ({ pong }) => {
				await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);

				// Should switch to expression with =
				await pong.ndv.getAssignmentCollectionAdd('assignments').click();
				await pong.ndv.fillParameterInputByName('value', '=');

				// Should complete {{ --> {{ | }}
				await pong.ndv.getInlineExpressionEditorInput().click();
				await pong.ndv.typeInExpressionEditor('{{');
				await expect(pong.ndv.getInlineExpressionEditorInput()).toHaveText('{{  }}');

				// Should switch back to fixed with backspace on empty expression
				await pong.ndv.clearExpressionEditor('value');
				await expect(pong.ndv.getParameterInputHint()).toContainText('empty');
				const parameterInput = pong.ndv.getParameterInputTextbox('value');
				await parameterInput.click();
				await parameterInput.focus();
				await parameterInput.press('Backspace');
				await expect(pong.ndv.getInlineExpressionEditorInput()).toBeHidden();
			});
		});

		test.describe('Static data', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
				await pong.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
			});

			test('should resolve primitive resolvables', async ({ pong }) => {
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ 1 + 2');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('3');

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ "ab" + "cd"');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('abcd');

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ true && false');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('false');
			});

			test('should resolve object resolvables', async ({ pong }) => {
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ { a: 1 }');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText(
					/^\[Object: \{"a": 1\}\]$/,
				);

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ { a: 1 }.a');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('1');
			});

			test('should resolve array resolvables', async ({ pong }) => {
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ [1, 2, 3]');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText(
					/^\[Array: \[1,2,3\]\]$/,
				);

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ [1, 2, 3][0]');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('1');
			});

			test('should resolve bare identifiers through the workflow data context', async ({ pong }) => {
				// `origin` is declared inside the nested block only, so the read after
				// it is a free read and resolves through the data context.
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor(
					"{{ (() => { { let origin = 'inner'; } return origin; })()",
				);
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('[undefined]');

				// Same expression with the read inside the block, so the name is in scope.
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor(
					"{{ (() => { { let origin = 'inner'; return origin; } })()",
				);
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('inner');
			});
		});

		test.describe('Dynamic data', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
				await pong.ndv.setPinnedData([{ myStr: 'Monday' }]);
				await pong.ndv.close();
				await pong.canvas.addNode(NO_OPERATION_NODE_NAME, { closeNDV: true });
				await pong.canvas.addNode(HACKER_NEWS_NODE_NAME, { action: HACKER_NEWS_ACTION });
				await pong.ndv.activateParameterExpressionEditor(HACKER_NEWS_PARAMETER_NAME);
			});

			test('should resolve $parameter[]', async ({ pong }) => {
				await pong.ndv.clearExpressionEditor();
				// Resolving $parameter is slow, especially on CI runner
				await pong.ndv.typeInExpressionEditor('{{ $parameter["operation"]');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('getAll');
			});

			test('should resolve input: $json,$input,$(nodeName)', async ({ pong }) => {
				// Previous nodes have not run, input is empty
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ $json.myStr');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText(
					'[Execute previous nodes for preview]',
				);

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ $input.item.json.myStr');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText(
					'[Execute previous nodes for preview]',
				);

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor("{{ $('No Operation, do nothing').item.json.myStr");
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText(
					'[Execute previous nodes for preview]',
				);

				// Run workflow
				await pong.ndv.close();
				await pong.canvas.executeNode(NO_OPERATION_NODE_NAME);
				await pong.canvas.openNode(HACKER_NEWS_ACTION);
				await pong.ndv.activateParameterExpressionEditor(HACKER_NEWS_PARAMETER_NAME);

				// Previous nodes have run, input can be resolved
				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ $json.myStr');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('Monday');

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor('{{ $input.item.json.myStr');
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('Monday');

				await pong.ndv.clearExpressionEditor();
				await pong.ndv.typeInExpressionEditor("{{ $('No Operation, do nothing').item.json.myStr");
				await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('Monday');
			});
		});
	},
);
