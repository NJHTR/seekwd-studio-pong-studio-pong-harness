import { test, expect } from '../../../fixtures/base';

test.describe(
	'MCP connection parameter copy button',
	{ annotation: [{ type: 'owner', description: 'Context' }] },
	() => {
		test('fills the copy control height on hover', async ({ pong, api }) => {
			// ADO-5385: The hover background must reach both edges of the copy control.
			await api.setMcpAccess(true);
			await pong.start.fromHome();
			await pong.settingsMcp.goto();
			await pong.settingsMcp.getConnectButton().click();

			const button = pong.settingsMcp.getCopyButton();
			await expect(button).toBeVisible();
			const backgroundBeforeHover = await button.evaluate(
				(element) => getComputedStyle(element).backgroundColor,
			);
			await button.hover();
			const backgroundOnHover = await button.evaluate(
				(element) => getComputedStyle(element).backgroundColor,
			);
			expect(backgroundOnHover).not.toBe(backgroundBeforeHover);

			const buttonBox = await button.boundingBox();
			const containerBox = await pong.settingsMcp.getCopyButtonContainer().boundingBox();
			expect(buttonBox).not.toBeNull();
			expect(containerBox).not.toBeNull();

			// The input container has a one-pixel border on each edge.
			expect.soft(Math.abs(buttonBox!.y - containerBox!.y)).toBeLessThanOrEqual(1);
			expect(
				Math.abs(buttonBox!.y + buttonBox!.height - containerBox!.y - containerBox!.height),
			).toBeLessThanOrEqual(1);
		});
	},
);
