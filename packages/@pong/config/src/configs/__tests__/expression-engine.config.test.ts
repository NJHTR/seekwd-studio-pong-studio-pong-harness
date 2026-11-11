import { Container } from '@pong/di';

import { ExpressionEngineConfig } from '../expression-engine.config';

describe('ExpressionEngineConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.resetAllMocks();
		vi.unstubAllEnvs();
	});

	describe('defaults', () => {
		test('engine defaults to vm', () => {
			expect(Container.get(ExpressionEngineConfig).engine).toBe('vm');
		});

		test('frontendEngine defaults to legacy', () => {
			expect(Container.get(ExpressionEngineConfig).frontendEngine).toBe('legacy');
		});

		test('bridgeTimeout defaults to 5000', () => {
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
		});

		test('bridgeMemoryLimit defaults to 128', () => {
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
		});
	});

	describe('PONG_EXPRESSION_ENGINE', () => {
		test('overrides engine to legacy', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE', 'legacy');
			expect(Container.get(ExpressionEngineConfig).engine).toBe('legacy');
		});

		test('falls back to default on invalid value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE', 'not-an-engine');
			expect(Container.get(ExpressionEngineConfig).engine).toBe('vm');
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe('PONG_EXPRESSION_ENGINE_FRONTEND', () => {
		test('overrides frontendEngine to quickjs', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_FRONTEND', 'quickjs');
			expect(Container.get(ExpressionEngineConfig).frontendEngine).toBe('quickjs');
		});

		// isolated-vm is a native module, so the editor can never run it.
		test('rejects vm and falls back to legacy', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_FRONTEND', 'vm');
			expect(Container.get(ExpressionEngineConfig).frontendEngine).toBe('legacy');
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('falls back to default on invalid value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_FRONTEND', 'not-an-engine');
			expect(Container.get(ExpressionEngineConfig).frontendEngine).toBe('legacy');
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('is independent of the backend engine', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE', 'vm');
			vi.stubEnv('PONG_EXPRESSION_ENGINE_FRONTEND', 'quickjs');
			const config = Container.get(ExpressionEngineConfig);
			expect(config.engine).toBe('vm');
			expect(config.frontendEngine).toBe('quickjs');
		});
	});

	describe('PONG_EXPRESSION_ENGINE_IDLE_TIMEOUT', () => {
		test('overrides idleTimeout', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_IDLE_TIMEOUT', '60');
			const config = Container.get(ExpressionEngineConfig);
			expect(config.idleTimeout).toBe(60);
		});

		test('parses "0" as the number 0 (distinct from undefined/unset)', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_IDLE_TIMEOUT', '0');
			const config = Container.get(ExpressionEngineConfig);
			expect(config.idleTimeout).toBe(0);
			expect(config.idleTimeout).not.toBeUndefined();
		});
	});

	describe('PONG_EXPRESSION_ENGINE_NATIVE_EVALUATION_VERIFY_SAMPLE', () => {
		test('overrides nativeEvaluationVerifySample', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_NATIVE_EVALUATION_VERIFY_SAMPLE', '0.5');
			expect(Container.get(ExpressionEngineConfig).nativeEvaluationVerifySample).toBe(0.5);
		});

		test.each(['2', '-0.1'])('falls back to default on %s', (value) => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_NATIVE_EVALUATION_VERIFY_SAMPLE', value);
			expect(Container.get(ExpressionEngineConfig).nativeEvaluationVerifySample).toBe(0);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('keeps the default on an empty value', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_NATIVE_EVALUATION_VERIFY_SAMPLE', '');
			expect(Container.get(ExpressionEngineConfig).nativeEvaluationVerifySample).toBe(0);
		});
	});

	describe('PONG_EXPRESSION_ENGINE_TIMEOUT', () => {
		test('overrides bridgeTimeout', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_TIMEOUT', '1000');
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(1000);
		});

		test('falls back to default on non-numeric value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_TIMEOUT', 'not-a-number');
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('falls back to default on fractional value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_TIMEOUT', '2.5');
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('falls back to default on non-positive value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_TIMEOUT', '0');
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe('PONG_EXPRESSION_ENGINE_MEMORY_LIMIT', () => {
		test('overrides bridgeMemoryLimit', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_MEMORY_LIMIT', '64');
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(64);
		});

		test('falls back to default on non-numeric value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_MEMORY_LIMIT', 'not-a-number');
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('falls back to default on value below the isolate minimum', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_MEMORY_LIMIT', '4');
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('falls back to default on fractional value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_MEMORY_LIMIT', '8.5');
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe('observability defaults', () => {
		test('observabilityEnabled defaults to true', () => {
			expect(Container.get(ExpressionEngineConfig).observabilityEnabled).toBe(true);
		});

		test('tracesEnabled defaults to false', () => {
			expect(Container.get(ExpressionEngineConfig).tracesEnabled).toBe(false);
		});

		test('slowEvaluationThresholdMs defaults to 50', () => {
			expect(Container.get(ExpressionEngineConfig).slowEvaluationThresholdMs).toBe(50);
		});

		test('tracesSampleRate defaults to 0', () => {
			expect(Container.get(ExpressionEngineConfig).tracesSampleRate).toBe(0);
		});
	});

	describe('observability overrides', () => {
		test('PONG_EXPRESSION_ENGINE_OBSERVABILITY_ENABLED disables observability', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_OBSERVABILITY_ENABLED', 'false');
			expect(Container.get(ExpressionEngineConfig).observabilityEnabled).toBe(false);
		});

		test('PONG_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS overrides threshold', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS', '100');
			expect(Container.get(ExpressionEngineConfig).slowEvaluationThresholdMs).toBe(100);
		});

		test('PONG_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS falls back to default on non-positive value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS', '0');
			expect(Container.get(ExpressionEngineConfig).slowEvaluationThresholdMs).toBe(50);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('PONG_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE overrides sample rate', () => {
			vi.stubEnv('PONG_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE', '0.25');
			expect(Container.get(ExpressionEngineConfig).tracesSampleRate).toBe(0.25);
		});

		test('PONG_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE falls back to default on out-of-range value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('PONG_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE', '1.5');
			expect(Container.get(ExpressionEngineConfig).tracesSampleRate).toBe(0);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});
});
