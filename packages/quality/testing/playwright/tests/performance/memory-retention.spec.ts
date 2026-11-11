import { test, expect } from '../../fixtures/base';
import type { pongPage } from '../../pages/pongPage';
import { attachMetric, getStableHeap } from '../../utils/performance-helper';

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe(
	'Memory Leak Detection',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		async function performMemoryAction(pong: pongPage) {
			await pong.start.fromBlankCanvas();
			await pong.navigate.toWorkflows();
		}

		test('Memory should be released after actions', async ({
			pongContainer,
			pong,
			services,
		}, testInfo) => {
			const obs = services.observability;

			const baseline = await getStableHeap(pongContainer.baseUrl, obs.metrics);
			await performMemoryAction(pong);
			await pong.page.goto('/home/workflows');
			const final = await getStableHeap(pongContainer.baseUrl, obs.metrics);

			const retainedMB = final.heapUsedMB - baseline.heapUsedMB;
			const retentionPercent = (retainedMB / baseline.heapUsedMB) * 100;

			await attachMetric(testInfo, 'memory-heap-retention-percent', retentionPercent, '%');
			await attachMetric(testInfo, 'memory-heap-used-pre-action', baseline.heapUsedMB, 'MB');
			await attachMetric(testInfo, 'memory-heap-used-post-action', final.heapUsedMB, 'MB');
			await attachMetric(testInfo, 'memory-heap-retained', retainedMB, 'MB');

			expect(baseline.heapUsedMB).toBeGreaterThan(0);
			expect(final.heapUsedMB).toBeGreaterThan(0);

			console.log(
				`[MEMORY RETENTION] Baseline: ${baseline.heapUsedMB.toFixed(1)} MB | ` +
					`Final: ${final.heapUsedMB.toFixed(1)} MB | ` +
					`Retained: ${retainedMB.toFixed(1)} MB (${retentionPercent.toFixed(1)}%)`,
			);
		});
	},
);
