import { isEnvFeatureEnabled } from '../environment';

describe('isEnvFeatureEnabled', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('should return true when the env var is exactly "true"', () => {
		process.env.PONG_ENV_FEAT_SOME_FLAG = 'true';

		expect(isEnvFeatureEnabled('PONG_ENV_FEAT_SOME_FLAG')).toBe(true);
	});

	it('should return false when the env var is unset', () => {
		delete process.env.PONG_ENV_FEAT_SOME_FLAG;

		expect(isEnvFeatureEnabled('PONG_ENV_FEAT_SOME_FLAG')).toBe(false);
	});

	it.each(['false', 'TRUE', '1', ''])('should return false when the env var is %p', (value) => {
		process.env.PONG_ENV_FEAT_SOME_FLAG = value;

		expect(isEnvFeatureEnabled('PONG_ENV_FEAT_SOME_FLAG')).toBe(false);
	});

	it('should read the env var on every call', () => {
		delete process.env.PONG_ENV_FEAT_SOME_FLAG;
		expect(isEnvFeatureEnabled('PONG_ENV_FEAT_SOME_FLAG')).toBe(false);

		process.env.PONG_ENV_FEAT_SOME_FLAG = 'true';
		expect(isEnvFeatureEnabled('PONG_ENV_FEAT_SOME_FLAG')).toBe(true);
	});

	it('should read only the env var it is given', () => {
		process.env.SOME_FLAG = 'true';
		delete process.env.PONG_ENV_FEAT_SOME_FLAG;

		expect(isEnvFeatureEnabled('PONG_ENV_FEAT_SOME_FLAG')).toBe(false);
	});
});
