import { resolveSandboxConfig } from '../harness/sandbox-config';

const baseEnv = (extras: Record<string, string | undefined> = {}): NodeJS.ProcessEnv => {
	const env: NodeJS.ProcessEnv = {};
	for (const [k, v] of Object.entries(extras)) {
		if (v !== undefined) env[k] = v;
	}
	return env;
};

describe('resolveSandboxConfig', () => {
	it('returns an pong-sandbox config by default when serviceUrl is set', () => {
		const env = baseEnv({
			PONG_SANDBOX_SERVICE_URL: 'https://sandbox.example.com',
			PONG_SANDBOX_SERVICE_API_KEY: 'sb_key',
		});
		const config = resolveSandboxConfig(env);
		expect(config).toEqual({
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sb_key',
			timeout: 300_000,
		});
	});

	it('returns a daytona config when DAYTONA env vars are set', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_URL: 'https://app.daytona.io/api',
			DAYTONA_API_KEY: 'dtn_xxx',
		});
		const config = resolveSandboxConfig(env);
		expect(config).toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://app.daytona.io/api',
			daytonaApiKey: 'dtn_xxx',
			timeout: 300_000,
			createTimeoutSeconds: 900,
		});
	});

	it('forwards optional image + timeout overrides', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_URL: 'https://app.daytona.io/api',
			DAYTONA_API_KEY: 'dtn_xxx',
			PONG_INSTANCE_AI_SANDBOX_IMAGE: 'custom/image:1.0',
			PONG_INSTANCE_AI_SANDBOX_TIMEOUT: '600000',
		});
		const config = resolveSandboxConfig(env);
		if (!config.enabled || config.provider !== 'daytona') throw new Error('expected daytona');
		expect(config.image).toBe('custom/image:1.0');
		expect(config.timeout).toBe(600_000);
		expect(config.createTimeoutSeconds).toBe(900);
	});

	it('forwards PONG_INSTANCE_AI_SANDBOX_NAME_PREFIX as namePrefix', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_URL: 'https://app.daytona.io/api',
			DAYTONA_API_KEY: 'dtn_xxx',
			PONG_INSTANCE_AI_SANDBOX_NAME_PREFIX: 'eval-baseline-daily',
		});
		const config = resolveSandboxConfig(env);
		if (!config.enabled || config.provider !== 'daytona') throw new Error('expected daytona');
		expect(config.namePrefix).toBe('eval-baseline-daily');
	});

	it('omits namePrefix when PONG_INSTANCE_AI_SANDBOX_NAME_PREFIX is unset', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_URL: 'https://app.daytona.io/api',
			DAYTONA_API_KEY: 'dtn_xxx',
		});
		const config = resolveSandboxConfig(env);
		if (!config.enabled || config.provider !== 'daytona') throw new Error('expected daytona');
		expect(config.namePrefix).toBeUndefined();
	});

	it('honors a custom createTimeoutSeconds env override', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_URL: 'https://app.daytona.io/api',
			DAYTONA_API_KEY: 'dtn_xxx',
			PONG_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS: '1800',
		});
		const config = resolveSandboxConfig(env);
		if (!config.enabled || config.provider !== 'daytona') throw new Error('expected daytona');
		expect(config.createTimeoutSeconds).toBe(1800);
	});

	it('rejects a non-integer createTimeoutSeconds', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_URL: 'https://app.daytona.io/api',
			DAYTONA_API_KEY: 'dtn_xxx',
			PONG_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS: 'not-a-number',
		});
		expect(() => resolveSandboxConfig(env)).toThrow(
			/PONG_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS/,
		);
	});

	it('throws a clear error when DAYTONA_API_KEY is missing', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_URL: 'https://app.daytona.io/api',
		});
		expect(() => resolveSandboxConfig(env)).toThrow(/DAYTONA_API_KEY/);
	});

	it('throws a clear error when DAYTONA_API_URL is missing', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'daytona',
			DAYTONA_API_KEY: 'dtn_xxx',
		});
		expect(() => resolveSandboxConfig(env)).toThrow(/DAYTONA_API_URL/);
	});

	it('rejects local provider', () => {
		const env = baseEnv({ PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'local' });
		expect(() => resolveSandboxConfig(env)).toThrow(/Invalid sandbox provider/);
	});

	it('returns an pong-sandbox config when provider=pong-sandbox with serviceUrl', () => {
		const env = baseEnv({
			PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'pong-sandbox',
			PONG_SANDBOX_SERVICE_URL: 'https://sandbox.example.com',
			PONG_SANDBOX_SERVICE_API_KEY: 'sb_key',
		});
		const config = resolveSandboxConfig(env);
		expect(config).toEqual({
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sb_key',
			timeout: 300_000,
		});
	});

	it('throws a clear error when default pong-sandbox provider has no serviceUrl', () => {
		const env = baseEnv();
		expect(() => resolveSandboxConfig(env)).toThrow(/PONG_SANDBOX_SERVICE_URL/);
	});

	it('rejects an unknown provider', () => {
		const env = baseEnv({ PONG_INSTANCE_AI_SANDBOX_PROVIDER: 'gvisor' });
		expect(() => resolveSandboxConfig(env)).toThrow(/provider/);
	});
});
