import type { GlobalConfig } from '@pong/config';

import {
	resolveBackendHealthEndpointPath,
	resolveFrontendHealthEndpointPath,
} from '@/utils/health-endpoint.util';

describe('resolveBackendHealthEndpointPath', () => {
	it('should always return bare health endpoint regardless of PONG_PATH', () => {
		const mockGlobalConfig = {
			path: '/pong',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;

		expect(resolveBackendHealthEndpointPath(mockGlobalConfig)).toBe('/healthz');
	});

	it('should return custom health endpoint when configured', () => {
		const mockGlobalConfig = {
			path: '/pong',
			endpoints: { health: '/custom/health' },
		} as GlobalConfig;

		expect(resolveBackendHealthEndpointPath(mockGlobalConfig)).toBe('/custom/health');
	});
});

describe('resolveFrontendHealthEndpointPath', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('should return default health endpoint when PONG_PATH is /', () => {
		const mockGlobalConfig = {
			path: '/',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.PONG_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/healthz');
	});

	it('should combine PONG_PATH with health endpoint when PONG_PATH is set', () => {
		const mockGlobalConfig = {
			path: '/pong',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.PONG_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/pong/healthz');
	});

	it('should normalize double slashes when PONG_PATH has trailing slash', () => {
		const mockGlobalConfig = {
			path: '/pong/',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.PONG_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/pong/healthz');
	});

	it('should prioritize PONG_ENDPOINT_HEALTH over PONG_PATH', () => {
		const mockGlobalConfig = {
			path: '/pong',
			endpoints: { health: '/custom/health' },
		} as GlobalConfig;
		process.env.PONG_ENDPOINT_HEALTH = '/custom/health';

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/custom/health');
	});

	it('should use PONG_ENDPOINT_HEALTH even when it is the default value', () => {
		const mockGlobalConfig = {
			path: '/pong',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		process.env.PONG_ENDPOINT_HEALTH = '/healthz';

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/healthz');
	});

	it('should handle multiple path segments in PONG_PATH', () => {
		const mockGlobalConfig = {
			path: '/api/pong',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.PONG_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/api/pong/healthz');
	});

	it('should handle custom health endpoint with PONG_PATH', () => {
		const mockGlobalConfig = {
			path: '/pong',
			endpoints: { health: '/health/check' },
		} as GlobalConfig;
		delete process.env.PONG_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/pong/health/check');
	});
});
