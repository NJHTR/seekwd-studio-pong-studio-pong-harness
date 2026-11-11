import {
	DEFAULT_SANDBOX_PROVIDER,
	isSandboxProvider,
	normalizeSandboxProvider,
} from '../../../workspace/sandbox/provider';

describe('normalizeSandboxProvider', () => {
	it('returns pong-sandbox for undefined', () => {
		expect(normalizeSandboxProvider(undefined)).toBe('pong-sandbox');
	});

	it('returns pong-sandbox for empty string', () => {
		expect(normalizeSandboxProvider('')).toBe('pong-sandbox');
	});

	it('returns pong-sandbox for valid pong-sandbox value', () => {
		expect(normalizeSandboxProvider('pong-sandbox')).toBe('pong-sandbox');
	});

	it('returns daytona for valid daytona value', () => {
		expect(normalizeSandboxProvider('daytona')).toBe('daytona');
	});

	it('returns pong-sandbox for unrecognized value', () => {
		expect(normalizeSandboxProvider('bad-value')).toBe('pong-sandbox');
	});
});

describe('isSandboxProvider', () => {
	it('returns true for daytona', () => {
		expect(isSandboxProvider('daytona')).toBe(true);
	});

	it('returns false for bad value', () => {
		expect(isSandboxProvider('bad-value')).toBe(false);
	});
});

describe('DEFAULT_SANDBOX_PROVIDER', () => {
	it('is pong-sandbox', () => {
		expect(DEFAULT_SANDBOX_PROVIDER).toBe('pong-sandbox');
	});
});
