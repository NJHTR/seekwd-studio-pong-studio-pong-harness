import { instanceAiSandboxProviderSchema } from '@pong/api-types';
import { normalizeSandboxProvider as normalizeRuntimeSandboxProvider } from '@pong/agents/sandbox';
import { OperationalError } from '@pong/errors';

import {
	PONG_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE,
	normalizeSandboxProvider,
	requirePongSandboxServiceUrl,
} from '../sandbox-provider';

describe('sandbox-provider', () => {
	describe('normalizeSandboxProvider', () => {
		it('stays aligned with runtime sandbox providers', () => {
			for (const provider of instanceAiSandboxProviderSchema.options) {
				expect(normalizeRuntimeSandboxProvider(provider)).toBe(provider);
			}
		});

		it('returns supported sandbox providers unchanged', () => {
			expect(normalizeSandboxProvider('pong-sandbox')).toBe('pong-sandbox');
			expect(normalizeSandboxProvider('daytona')).toBe('daytona');
		});

		it('falls back to pong-sandbox for unsupported values', () => {
			expect(normalizeSandboxProvider('local')).toBe('pong-sandbox');
			expect(normalizeSandboxProvider(undefined)).toBe('pong-sandbox');
		});
	});

	describe('requirePongSandboxServiceUrl', () => {
		it('trims and returns a configured service URL', () => {
			expect(requirePongSandboxServiceUrl('  http://sandbox-api:8080  ')).toBe(
				'http://sandbox-api:8080',
			);
		});

		it('throws an operational error when the service URL is missing', () => {
			expect(() => requirePongSandboxServiceUrl('   ')).toThrow(OperationalError);
			expect(() => requirePongSandboxServiceUrl('   ')).toThrow(
				PONG_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE,
			);
		});
	});
});
