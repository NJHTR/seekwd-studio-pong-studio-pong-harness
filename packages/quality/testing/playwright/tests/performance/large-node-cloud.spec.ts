import { test, expect } from '../../fixtures/base';
import type { pongPage } from '../../pages/pongPage';
import { measurePerformance, attachMetric } from '../../utils/performance-helper';

async function setupPerformanceTest(pong: pongPage, size: number) {
	await pong.start.fromImportedWorkflow('large.json');
	await pong.notifications.closeNotificationByText('Successful');

	await pong.canvas.openNode('Edit Fields');
	await pong.ndv.fillParameterInputByName('value', size.toString());
	await pong.ndv.clickBackToCanvasButton();
}

test.use({
	capability: {
		resourceQuota: {
			memory: 0.75,
			cpu: 0.5,
		},
	},
});
test.describe(
	'Large Data Size Performance - Cloud Resources',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('Code Node with 30000 items', async ({ pong }, testInfo) => {
			const itemCount = 30000;
			await setupPerformanceTest(pong, itemCount);
			const workflowExecuteTimeout = 65_000;
			const loopSize = 30;
			const stats = [];

			const triggerDuration = await measurePerformance(pong.page, 'trigger-workflow', async () => {
				await pong.workflowComposer.executeWorkflowAndWaitForNotification(
					'Workflow executed successfully',
					{
						timeout: workflowExecuteTimeout,
					},
				);
			});

			for (let i = 0; i < loopSize; i++) {
				const openNodeDuration = await measurePerformance(pong.page, `open-node-${i}`, async () => {
					await pong.canvas.openNode('Code');
				});

				stats.push(openNodeDuration);
				await pong.ndv.clickBackToCanvasButton();
			}
			const average = stats.reduce((a, b) => a + b, 0) / stats.length;

			await attachMetric(testInfo, 'open-node', average, 'ms', { item_count: itemCount });
			await attachMetric(testInfo, 'trigger-workflow', triggerDuration, 'ms', {
				item_count: itemCount,
			});

			expect(average).toBeGreaterThan(0);
			expect(triggerDuration).toBeGreaterThan(0);
			console.log(
				`[PERF] Open node avg: ${average.toFixed(2)} ms | Workflow trigger: ${triggerDuration.toFixed(2)} ms`,
			);
		});
	},
);
