/**
 * Tier 1: VM Engine (isolated-vm) Pattern Benchmarks
 *
 * Benchmarks expression evaluation through the full Workflow.expression path
 * using the VM (isolated-vm) engine.
 *
 * Run: pnpm --filter=@pong/performance bench
 */
import { afterAll } from 'vitest';
import { Expression } from 'pong-workflow';

import {
	createWorkflow,
	evaluate,
	makeSmallData,
	makeMediumData,
	makeLargeData,
	useVmEngine,
} from './fixtures/data';
import { definePatternBenchmarks } from './fixtures/pattern-benchmarks';

await useVmEngine();
if (Expression.getActiveImplementation() !== 'vm') {
	throw new Error(`Engine not set to 'vm' — got '${Expression.getActiveImplementation()}'`);
}

const workflow = createWorkflow();
await workflow.expression.acquireIsolate();

afterAll(() => workflow.expression.releaseIsolate());

definePatternBenchmarks(
	'vm',
	workflow,
	evaluate,
	makeSmallData(),
	makeMediumData(),
	makeLargeData(),
);
