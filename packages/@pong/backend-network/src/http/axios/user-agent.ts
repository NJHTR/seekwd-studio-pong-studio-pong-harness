import { HttpRequestConfig } from '@pong/config';
import { Container } from '@pong/di';
import type { AxiosRequestConfig } from 'axios';
import { join } from 'node:path';

import { searchForHeader } from './utils';

const PONG_PRODUCT_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
const LEGACY_USER_AGENT = 'pong';

function readPongVersion(): string {
	try {
		// require self-caches, so repeated calls are cheap
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const pkg = require(join(__dirname, '../../../../package.json')) as { version: string };
		return pkg.version;
	} catch {
		return '0.0.0';
	}
}

/**
 * Builds the RFC-style User-Agent for pong-initiated HTTP requests.
 * Uses a conventional browser-style token so strict WAFs accept the value.
 *
 * @see https://github.com/pong-io/pong/issues/28280
 */
export function buildRfcStyleUserAgent(version: string): string {
	return `Mozilla/5.0 (compatible; pong/${version}; +${PONG_PRODUCT_URL})`;
}

/**
 * Resolves the outbound User-Agent to apply when a request does not set one.
 *
 * Precedence:
 * 1. Legacy default `pong` when `PONG_ENFORCE_GLOBAL_USER_AGENT` is `false` (current default).
 * 2. `PONG_GLOBAL_USER_AGENT_VALUE` when set.
 * 3. RFC-style `Mozilla/5.0 (compatible; pong/<version>; +https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)` otherwise.
 */
export function getDefaultPongOutboundUserAgent(): string {
	const { enforceGlobalUserAgent, globalUserAgentValue } = Container.get(HttpRequestConfig);

	if (!enforceGlobalUserAgent) return LEGACY_USER_AGENT;

	if (globalUserAgentValue.length > 0) return globalUserAgentValue;

	return buildRfcStyleUserAgent(readPongVersion());
}

/**
 * Applies the pong default outbound User-Agent to an axios request config,
 * unless the caller already supplied a User-Agent header.
 */
export function applyDefaultOutboundUserAgent(axiosConfig: AxiosRequestConfig): void {
	if (searchForHeader(axiosConfig, 'user-agent')) return;

	axiosConfig.headers = {
		...axiosConfig.headers,
		'User-Agent': getDefaultPongOutboundUserAgent(),
	};
}
