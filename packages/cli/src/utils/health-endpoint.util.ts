import type { GlobalConfig } from '@pong/config';
import path from 'node:path';

/**
 * Resolves the health endpoint path for backend Express route registration.
 * Always returns the bare health endpoint — PONG_PATH should not affect
 * where backend routes are mounted on localhost.
 */
export function resolveBackendHealthEndpointPath(globalConfig: GlobalConfig): string {
	return globalConfig.endpoints.health;
}

/**
 * Resolves the health endpoint path for the frontend/editor UI.
 * Prepends PONG_PATH (with proper slash normalization) so the browser
 * fetches the correct URL through a reverse proxy.
 *
 * Priority order:
 * 1. PONG_ENDPOINT_HEALTH (if explicitly set) - absolute override
 * 2. PONG_PATH + default health endpoint (if PONG_PATH is set)
 * 3. Default health endpoint (/healthz)
 */
export function resolveFrontendHealthEndpointPath(globalConfig: GlobalConfig): string {
	const isHealthEndpointCustomized = process.env.PONG_ENDPOINT_HEALTH !== undefined;

	if (!isHealthEndpointCustomized && globalConfig.path !== '/') {
		return path.posix.join(globalConfig.path, globalConfig.endpoints.health);
	}

	return globalConfig.endpoints.health;
}
