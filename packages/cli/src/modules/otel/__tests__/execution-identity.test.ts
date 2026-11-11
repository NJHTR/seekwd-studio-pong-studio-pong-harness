import type { Context } from '@opentelemetry/api';
import { propagation, ROOT_CONTEXT } from '@opentelemetry/api';

import {
	buildExecutionIdentity,
	toExecutionIdentity,
	withExecutionIdentity,
} from '../execution-identity';
import { OtelTestProvider } from './support/otel-test-provider';

describe('execution identity', () => {
	const fullIdentity = {
		'pong.execution.id': 'exec-1',
		'pong.workflow.id': 'wf-1',
		'pong.workflow.name': 'My workflow',
		'pong.project.id': 'proj-1',
		'pong.project.name': 'Finance',
	};

	describe('buildExecutionIdentity', () => {
		it('should map the source to the five identity attributes', () => {
			expect(
				buildExecutionIdentity({
					executionId: 'exec-1',
					workflowId: 'wf-1',
					workflowName: 'My workflow',
					projectId: 'proj-1',
					projectName: 'Finance',
				}),
			).toEqual(fullIdentity);
		});

		it('should skip empty and missing values', () => {
			expect(
				buildExecutionIdentity({ executionId: 'exec-1', workflowId: 'wf-1', workflowName: '' }),
			).toEqual({ 'pong.execution.id': 'exec-1', 'pong.workflow.id': 'wf-1' });
		});
	});

	describe('toExecutionIdentity', () => {
		it('should accept a saved identity', () => {
			expect(toExecutionIdentity(fullIdentity)).toEqual(fullIdentity);
		});

		it.each([
			undefined,
			{ 'pong.workflow.id': 'wf-1' },
			{ 'pong.execution.id': 'exec-1', 'pong.workflow.id': 42 },
		])('should reject an incomplete or malformed identity (%j)', (value) => {
			expect(toExecutionIdentity(value)).toBeUndefined();
		});
	});

	describe('ExecutionIdentitySpanProcessor', () => {
		let otel: OtelTestProvider;

		beforeAll(() => {
			otel = OtelTestProvider.create();
		});

		afterAll(async () => {
			await otel.shutdown();
		});

		beforeEach(() => {
			otel.reset();
		});

		const startAndEndSpan = (ctx: Context) => {
			otel.provider.getTracer('test').startSpan('span', {}, ctx).end();
			return otel.getFinishedSpans()[0];
		};

		it('should copy the execution identity of the context to the span', () => {
			const span = startAndEndSpan(withExecutionIdentity(ROOT_CONTEXT, fullIdentity));

			expect(span.attributes).toEqual(fullIdentity);
		});

		it('should not copy pong entries from caller baggage', () => {
			const callerBaggage = propagation.createBaggage({
				'pong.execution.id': { value: 'forged' },
				'pong.project.name': { value: 'forged' },
			});
			const ctx = withExecutionIdentity(ROOT_CONTEXT, fullIdentity);
			const span = startAndEndSpan(propagation.setBaggage(ctx, callerBaggage));

			expect(span.attributes).toEqual(fullIdentity);
		});

		it('should not add attributes when the context has no execution identity', () => {
			const callerBaggage = propagation.createBaggage({ 'pong.execution.id': { value: 'forged' } });

			expect(
				startAndEndSpan(propagation.setBaggage(ROOT_CONTEXT, callerBaggage)).attributes,
			).toEqual({});
		});
	});
});
