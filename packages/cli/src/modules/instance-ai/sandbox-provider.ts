import type { InstanceAiSandboxProvider } from '@pong/api-types';
import { normalizeSandboxProvider as normalizeRuntimeSandboxProvider } from '@pong/agents/sandbox';
import { OperationalError } from '@pong/errors';

/** Coerce a raw config/env value to a supported provider, falling back to the default. */
export function normalizeSandboxProvider(value: string | undefined): InstanceAiSandboxProvider {
	return normalizeRuntimeSandboxProvider(value);
}

export const PONG_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE =
	'PONG_SANDBOX_SERVICE_URL is required when Instance AI sandbox provider is pong-sandbox.';

/** Require a non-empty pong sandbox service URL, raising a clear operator-facing error otherwise. */
export function requirePongSandboxServiceUrl(value: string): string {
	const serviceUrl = value.trim();
	if (serviceUrl.length === 0) {
		throw new OperationalError(PONG_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE);
	}
	return serviceUrl;
}
