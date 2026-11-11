import { test, expect } from '../../../fixtures/base';
import type { Locator } from '@playwright/test';

async function expectButtonAligned(
	inputBorder: Locator,
	fromAiButton: Locator,
	radiusBorder = inputBorder,
) {
	await expect(inputBorder).toBeVisible();
	await expect(fromAiButton).toBeVisible();

	const inputBounds = await inputBorder.boundingBox();
	const buttonBounds = await fromAiButton.boundingBox();
	expect(inputBounds).not.toBeNull();
	expect(buttonBounds).not.toBeNull();

	expect(buttonBounds).toMatchObject({
		y: inputBounds!.y,
		height: inputBounds!.height,
	});

	const radius = await radiusBorder.evaluate(
		(element) => getComputedStyle(element).borderTopLeftRadius,
	);
	expect(radius).not.toBe('0px');
	await expect(fromAiButton).toHaveCSS('border-top-left-radius', '0px');
	await expect(fromAiButton).toHaveCSS('border-bottom-left-radius', '0px');
	await expect(fromAiButton).toHaveCSS('border-top-right-radius', radius);
	await expect(fromAiButton).toHaveCSS('border-bottom-right-radius', radius);
}

test.describe(
	'ADO-5599: From AI button alignment',
	{ annotation: [{ type: 'owner', description: 'NODES' }] },
	() => {
		test('aligns the From AI button outline with the tool parameter input border', async ({
			pong,
		}) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('AI Agent', { closeNDV: true });
			await pong.canvas.getInputPlusEndpointByType('AI Agent', 'ai_tool').click();
			await pong.canvas.nodeCreator.searchFor('SearXNG');
			await pong.canvas.nodeCreator.selectItem('SearXNG');
			await pong.ndv.addParameterOptionByName('Language');

			await expectButtonAligned(
				pong.ndv.getParameterInputBorder('language'),
				pong.ndv.getFromAiOverrideButton('language'),
			);

			await pong.ndv.addParameterOptionByName('Number of Results');
			await expectButtonAligned(
				pong.ndv.getParameterNumberBorder('numResults'),
				pong.ndv.getFromAiOverrideButton('numResults'),
			);

			await pong.ndv.setParameterInput('language', '={{ $json.language }}');
			await expectButtonAligned(
				pong.ndv.getParameterExpressionBorder('language'),
				pong.ndv.getFromAiOverrideButton('language'),
				pong.ndv.getParameterExpressionPrefixBorder('language'),
			);
		});

		test('joins the From AI button to the top corner of a multiline input', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode('AI Agent', { closeNDV: true });
			await pong.canvas.getInputPlusEndpointByType('AI Agent', 'ai_tool').click();
			await pong.canvas.nodeCreator.searchFor('HTTP Request Tool');
			await pong.canvas.nodeCreator.selectItem('HTTP Request Tool');
			await pong.ndv.setParameterSwitch('sendBody', true);
			await pong.ndv.setParameterDropdown('specifyBody', 'Using JSON');

			const input = pong.ndv.getParameterCodeEditorBorder('jsonBody');
			const button = pong.ndv.getFromAiOverrideButton('jsonBody');
			await expect(input).toBeVisible();
			await expect(button).toBeVisible();

			const radius = await input.evaluate(
				(element) => getComputedStyle(element).borderTopLeftRadius,
			);
			await expect(button).toHaveCSS('border-top-left-radius', radius);
			await expect(button).toHaveCSS('border-top-right-radius', radius);
			await expect(button).toHaveCSS('border-bottom-left-radius', '0px');
			await expect(button).toHaveCSS('border-bottom-right-radius', '0px');

			const inputBounds = await input.boundingBox();
			const buttonBounds = await button.boundingBox();
			expect(inputBounds).not.toBeNull();
			expect(buttonBounds).not.toBeNull();
			expect(buttonBounds!.x + buttonBounds!.width).toBeCloseTo(
				inputBounds!.x + inputBounds!.width,
				0,
			);
			const overlap = buttonBounds!.y + buttonBounds!.height - inputBounds!.y;
			expect(overlap).toBeGreaterThanOrEqual(0);
			expect(overlap).toBeLessThanOrEqual(2);
		});
	},
);
