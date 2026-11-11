/**
 * Regression coverage for LIGO-304: Executions list not loading on longer screens.
 *
 * On tall viewports (and at low browser zoom levels) the default 20 executions
 * fit without overflow, so no scrollbar appears. Without the fix the
 * IntersectionObserver disconnects after firing once, leaving the user stuck
 * at 20 executions with no way to load more.
 */

import { test, expect } from '../../../../../fixtures/base';

test.use({
	capability: { env: { TEST_ISOLATION: 'ligo-304-executions-list-infinite-scroll' } },
});

test.describe(
	'Executions list infinite scroll',
	{
		annotation: [
			{ type: 'owner', description: 'Lifecycle & Governance' },
			{ type: 'issue', description: 'LIGO-304' },
		],
	},
	() => {
		const TOTAL_EXECUTIONS = 25;
		const TALL_VIEWPORT = { width: 1920, height: 2000 };

		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		test('should auto-load remaining executions when the sidebar fits without a scrollbar', async ({
			pong,
		}) => {
			await pong.executionsComposer.createExecutions(TOTAL_EXECUTIONS);
			await pong.canvas.clickExecutionsTab();
			await pong.page.setViewportSize(TALL_VIEWPORT);

			await expect(pong.executions.getExecutionsList()).toBeVisible();
			await expect(pong.executions.getExecutionItems().first()).toBeVisible();

			const hasScrollbar = await pong.executions.getExecutionsList().evaluate((listElement) => {
				return listElement.scrollHeight > listElement.clientHeight;
			});
			expect(hasScrollbar).toBe(false);

			await expect(pong.executions.getExecutionItems()).toHaveCount(TOTAL_EXECUTIONS, {
				timeout: 15000,
			});
		});

		test('should keep loading on manual scroll on a tall viewport', async ({ pong }) => {
			await pong.executionsComposer.createExecutions(TOTAL_EXECUTIONS);
			await pong.canvas.clickExecutionsTab();
			await pong.page.setViewportSize(TALL_VIEWPORT);

			await expect(pong.executions.getExecutionsList()).toBeVisible();
			await expect(pong.executions.getExecutionItems().first()).toBeVisible();

			await pong.executions.scrollExecutionsListToBottom();

			await expect(pong.executions.getExecutionItems()).toHaveCount(TOTAL_EXECUTIONS, {
				timeout: 15000,
			});
		});
	},
);
