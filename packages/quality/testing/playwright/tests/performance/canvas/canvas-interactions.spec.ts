import { TIER_CONFIG, buildCanvasBenchmarkWorkflow, type Tier } from './fixtures/generate-workflow';
import { waitForCanvasReady } from './helpers/canvas-ready';
import { captureFrameStats } from './helpers/frame-stats';
import { medianBy, withWarmup } from './helpers/iterate';
import {
	enableRenderTracking,
	isRenderTrackingActive,
	readRenderStats,
	startRenderTracking,
} from './helpers/render-stats';
import { fmt, formatReport } from './helpers/report';
import { test, expect } from '../../../fixtures/base';
import { attachMetric, measurePerformance } from '../../../utils/performance-helper';

const ITERATIONS = 3;
const FRAME_BUDGET_MS = 1500;
const TIERS: Tier[] = ['S', 'M', 'L'];

test.use({
	capability: {
		resourceQuota: { memory: 0.75, cpu: 0.5 },
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
	},
});

test.describe(
	'Canvas Interactions Benchmark',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		for (const tier of TIERS) {
			test(`interactions ${tier}-tier @tier:${tier}`, async ({ pong, api }, testInfo) => {
				test.skip(
					tier !== 'S' && !!process.env.CI,
					'CI only runs S tier; M / L run locally via `pnpm bench:canvas`',
				);

				test.setTimeout(420_000);

				const { workflow, midDepthNodeName, sampleNodeNames } = buildCanvasBenchmarkWorkflow({
					tier,
				});
				const created = await api.workflows.createWorkflow(workflow);
				const workflowId: string = String(created.id);
				const { nodes: flowNodes, stickyNotes } = TIER_CONFIG[tier];

				await pong.page.setViewportSize({ width: 1536, height: 960 });
				await pong.page.emulateMedia({ reducedMotion: 'reduce' });
				// Arm the re-render counter before navigating so editor-ui installs the
				// tracking mixin on boot.
				await enableRenderTracking(pong.page);

				// janitor-disable-next-line no-raw-editor-navigation -- benchmark navigates raw and measures load via waitForCanvasReady below
				await pong.page.goto(`/workflow/${workflowId}`);
				await waitForCanvasReady(pong.page, flowNodes, stickyNotes);
				expect(await isRenderTrackingActive(pong.page)).toBe(true);
				await pong.canvas.clickZoomToFitButton();

				const dimensions = { tier };

				// Zoom — frame stats during a burst of zoom-in clicks.
				const zoomSamples = await withWarmup(ITERATIONS, async () => {
					const stats = await captureFrameStats(pong.page, FRAME_BUDGET_MS, async () => {
						for (let press = 0; press < 4; press++) {
							await pong.canvas.clickZoomInButton();
						}
					});
					await pong.canvas.clickZoomToFitButton();
					return stats;
				});
				await attachMetric(
					testInfo,
					`canvas-zoom-frame-p95-${tier}-ms`,
					medianBy(zoomSamples, (sample) => sample.p95FrameMs),
					'ms',
					dimensions,
				);

				// Pan — middle-mouse drag in opposite directions per iteration to net out drift.
				const panSamples = await withWarmup(ITERATIONS, async (iteration) => {
					const direction = iteration % 2 === 0 ? 1 : -1;
					return await captureFrameStats(pong.page, FRAME_BUDGET_MS, async () => {
						await pong.canvas.panBy(direction * 240, direction * 120);
					});
				});
				await attachMetric(
					testInfo,
					`canvas-pan-frame-p95-${tier}-ms`,
					medianBy(panSamples, (sample) => sample.p95FrameMs),
					'ms',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-pan-longtask-count-${tier}`,
					medianBy(panSamples, (sample) => sample.longtaskCount),
					'count',
					dimensions,
				);

				await pong.canvas.clickZoomToFitButton();

				// Drag a single node — measure mousedown→up wall-clock plus the component
				// re-renders the move triggers. Undo between iterations.
				const dragSamples = await withWarmup(ITERATIONS, async (iteration) => {
					const dragName = sampleNodeNames[iteration % sampleNodeNames.length];
					await startRenderTracking(pong.page);
					const ms = await measurePerformance(pong.page, `drag-${tier}-${iteration}`, async () => {
						await pong.canvas.dragNodeToRelativePosition(dragName, 60, 40);
					});
					const renders = (await readRenderStats(pong.page)).total;
					await pong.canvas.hitUndo();
					return { ms, renders };
				});
				await attachMetric(
					testInfo,
					`canvas-drag-response-${tier}-ms`,
					medianBy(dragSamples, (sample) => sample.ms),
					'ms',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-rerender-drag-${tier}`,
					medianBy(dragSamples, (sample) => sample.renders),
					'count',
					dimensions,
				);

				// Multi-node move via keyboard nudge. Select-all → arrow key bursts → undo.
				// Counts re-renders across every selected node as they shift together.
				const moveSamples = await withWarmup(ITERATIONS, async () => {
					await pong.canvas.selectAll();
					await startRenderTracking(pong.page);
					const ms = await measurePerformance(pong.page, `move-${tier}`, async () => {
						await pong.canvas.nudgeSelectedNodes('right', 5);
					});
					const renders = (await readRenderStats(pong.page)).total;
					await pong.canvas.hitUndo();
					await pong.canvas.deselectAll();
					return { ms, renders };
				});
				await attachMetric(
					testInfo,
					`canvas-move-multi-${tier}-ms`,
					medianBy(moveSamples, (sample) => sample.ms),
					'ms',
					dimensions,
				);
				await attachMetric(
					testInfo,
					`canvas-rerender-move-${tier}`,
					medianBy(moveSamples, (sample) => sample.renders),
					'count',
					dimensions,
				);

				// Duplicate selected sample nodes — undo afterwards so subsequent iterations stay stable.
				const duplicateSamples = await withWarmup(ITERATIONS, async () => {
					for (let nodeIndex = 0; nodeIndex < sampleNodeNames.length; nodeIndex++) {
						const node = pong.canvas.nodeByName(sampleNodeNames[nodeIndex]);
						if (nodeIndex === 0) await node.click();
						else await node.click({ modifiers: ['Shift'] });
					}
					const ms = await measurePerformance(pong.page, `duplicate-${tier}`, async () => {
						await pong.canvas.duplicateSelectedNodes();
					});
					await pong.canvas.hitUndo();
					await pong.canvas.deselectAll();
					return ms;
				});
				await attachMetric(
					testInfo,
					`canvas-duplicate-${tier}-ms`,
					medianBy(duplicateSamples, (sample) => sample),
					'ms',
					dimensions,
				);

				// Open / close NDV on a deterministic mid-depth node.
				const ndvSamples = await withWarmup(ITERATIONS, async () => {
					const ms = await measurePerformance(pong.page, `ndv-open-${tier}`, async () => {
						await pong.canvas.openNode(midDepthNodeName);
						await expect(pong.ndv.getNodeParameters()).toBeVisible();
					});
					await pong.ndv.clickBackToCanvasButton();
					return ms;
				});
				await attachMetric(
					testInfo,
					`canvas-ndv-open-${tier}-ms`,
					medianBy(ndvSamples, (sample) => sample),
					'ms',
					dimensions,
				);

				// Tidy-up runs the layout algorithm — first call does the bulk of the work,
				// subsequent calls are largely idempotent. Single measurement is the meaningful one.
				const tidyMs = await measurePerformance(pong.page, `tidy-${tier}`, async () => {
					await pong.canvas.clickTidyUpButton();
				});
				await attachMetric(testInfo, `canvas-tidy-up-${tier}-ms`, tidyMs, 'ms', dimensions);

				console.log(
					formatReport(`Canvas Interactions Benchmark — ${tier} tier`, [
						{
							heading: 'Frame stats (p95)',
							rows: [
								{
									label: 'Zoom',
									value: fmt.ms(medianBy(zoomSamples, (sample) => sample.p95FrameMs)),
								},
								{
									label: 'Pan',
									value: fmt.ms(medianBy(panSamples, (sample) => sample.p95FrameMs)),
								},
								{
									label: 'Pan longtasks',
									value: fmt.count(medianBy(panSamples, (sample) => sample.longtaskCount)),
								},
							],
						},
						{
							heading: 'Interactions',
							rows: [
								{
									label: 'Drag response',
									value: fmt.ms(medianBy(dragSamples, (sample) => sample.ms)),
								},
								{
									label: 'Multi-node move',
									value: fmt.ms(medianBy(moveSamples, (sample) => sample.ms)),
								},
								{
									label: 'Duplicate',
									value: fmt.ms(medianBy(duplicateSamples, (sample) => sample)),
								},
								{ label: 'NDV open', value: fmt.ms(medianBy(ndvSamples, (sample) => sample)) },
								{ label: 'Tidy up', value: fmt.ms(tidyMs) },
							],
						},
						{
							heading: 'Re-renders (canvas changes)',
							rows: [
								{
									label: 'Drag node',
									value: fmt.count(medianBy(dragSamples, (sample) => sample.renders)),
								},
								{
									label: 'Multi-node move',
									value: fmt.count(medianBy(moveSamples, (sample) => sample.renders)),
								},
							],
						},
					]),
				);

				expect(medianBy(panSamples, (sample) => sample.p95FrameMs)).toBeGreaterThan(0);
				expect(medianBy(dragSamples, (sample) => sample.ms)).toBeGreaterThan(0);
				// Moving a node must re-render it — a zero means tracking silently broke.
				expect(medianBy(dragSamples, (sample) => sample.renders)).toBeGreaterThan(0);
			});
		}
	},
);
