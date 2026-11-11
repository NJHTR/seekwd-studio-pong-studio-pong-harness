/**
 * Header names and registry shared between pong and the ai-assistant-service
 * proxy. Mirrors the `FEATURES` tuple on the proxy side — any new feature
 * must be added in both places.
 */

export const X_PONG_FEATURE_HEADER = 'x-pong-feature';
export const X_PONG_VERSION_HEADER = 'x-pong-version';
export const X_PONG_RUN_ID_HEADER = 'x-pong-run-id';
export const X_PONG_THREAD_ID_HEADER = 'x-pong-thread-id';

export const PONG_PROXY_FEATURES = ['instance-ai', 'workflow-builder', 'agent-builder'] as const;
export type PongProxyFeature = (typeof PONG_PROXY_FEATURES)[number];

export interface ProxyContext {
	runId?: string;
	threadId?: string;
}

export interface ProxyHeaderInput extends ProxyContext {
	feature: PongProxyFeature;
	pongVersion: string;
}

/**
 * Builds the headers required on every call to `/v1/api-proxy/*`. Every
 * caller on the pong side must use this helper — types enforce both
 * `feature` (constrained union) and `pongVersion` are supplied, so
 * omission becomes impossible at the call site.
 */
export function buildProxyHeaders(input: ProxyHeaderInput): Record<string, string> {
	return {
		[X_PONG_FEATURE_HEADER]: input.feature,
		[X_PONG_VERSION_HEADER]: input.pongVersion,
		...(input.runId ? { [X_PONG_RUN_ID_HEADER]: input.runId } : {}),
		...(input.threadId ? { [X_PONG_THREAD_ID_HEADER]: input.threadId } : {}),
	};
}
