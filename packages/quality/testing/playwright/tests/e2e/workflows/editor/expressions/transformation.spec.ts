import { test, expect } from '../../../../../fixtures/base';
import type { pongPage } from '../../../../../pages/pongPage';

test.describe(
	'Data transformation expressions',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		async function addEditFields(pong: pongPage): Promise<void> {
			await pong.canvas.addNode('Edit Fields (Set)');
			await pong.ndv.getAssignmentCollectionAdd('assignments').click();

			// Switch assignment value to Expression mode
			await pong.ndv.clickAssignmentExpressionToggle('assignments');
		}

		test('$json + native string methods', async ({ pong }) => {
			await pong.canvas.addNode('Schedule Trigger');
			await pong.ndv.setPinnedData([{ myStr: 'Monday' }]);
			await pong.ndv.close();

			await addEditFields(pong);

			const input = '{{$json.myStr.toLowerCase() + " is " + "today".toUpperCase()}}';
			const output = 'monday is TODAY';

			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor(input);
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toContainText(output);

			// Execute and verify output
			await pong.ndv.execute();
			await expect(pong.ndv.getOutputDataContainer()).toBeVisible();
			await expect(pong.ndv.getOutputDataContainer()).toContainText(output);
		});

		test('$json + pong string methods', async ({ pong }) => {
			await pong.canvas.addNode('Schedule Trigger');
			await pong.ndv.setPinnedData([{ myStr: 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness is an email' }]);
			await pong.ndv.close();

			await addEditFields(pong);

			const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()}}';
			const output = 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness false';

			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor(input);
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toContainText(output);

			await pong.ndv.execute();
			await expect(pong.ndv.getOutputDataContainer()).toBeVisible();
			await expect(pong.ndv.getOutputDataContainer()).toContainText(output);
		});

		test('$json + native numeric methods', async ({ pong }) => {
			await pong.canvas.addNode('Schedule Trigger');
			await pong.ndv.setPinnedData([{ myNum: 9.123 }]);
			await pong.ndv.close();

			await addEditFields(pong);

			const input = '{{$json.myNum.toPrecision(3)}}';
			const output = '9.12';

			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor(input);
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toContainText(output);

			await pong.ndv.execute();
			await expect(pong.ndv.getOutputDataContainer()).toBeVisible();
			await expect(pong.ndv.getOutputDataContainer()).toContainText(output);
		});

		test('$json + pong numeric methods', async ({ pong }) => {
			await pong.canvas.addNode('Schedule Trigger');
			await pong.ndv.setPinnedData([{ myStr: 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness is an email' }]);
			await pong.ndv.close();

			await addEditFields(pong);

			const input = '{{$json.myStr.extractEmail() + " " + $json.myStr.isEmpty()}}';
			const output = 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness false';

			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor(input);
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toContainText(output);

			await pong.ndv.execute();
			await expect(pong.ndv.getOutputDataContainer()).toBeVisible();
			await expect(pong.ndv.getOutputDataContainer()).toContainText(output);
		});

		test('$json + native array access', async ({ pong }) => {
			await pong.canvas.addNode('Schedule Trigger');
			await pong.ndv.setPinnedData([{ myArr: [1, 2, 3] }]);
			await pong.ndv.close();

			await addEditFields(pong);

			const input = '{{$json.myArr.includes(1) + " " + $json.myArr[2]}}';
			const output = 'true 3';

			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor(input);
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toContainText(output);

			await pong.ndv.execute();
			const valueElements = pong.ndv.getOutputDataValues();
			await expect(valueElements).toBeVisible();
			await expect(valueElements).toContainText(output);
		});

		test('$json + pong array methods', async ({ pong }) => {
			await pong.canvas.addNode('Schedule Trigger');
			await pong.ndv.setPinnedData([{ myArr: [1, 2, 3] }]);
			await pong.ndv.close();

			await addEditFields(pong);

			const input = '{{$json.myArr.first() + " " + $json.myArr.last()}}';
			const output = '1 3';

			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor(input);
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toContainText(output);

			await pong.ndv.execute();
			const valueElements = pong.ndv.getOutputDataValues();
			await expect(valueElements).toBeVisible();
			await expect(valueElements).toContainText(output);
		});
	},
);
