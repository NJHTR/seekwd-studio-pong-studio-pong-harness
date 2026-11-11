/**
 * Shared contract between the server-side config injector and MCP app UIs.
 *
 * Keeping these values in one neutral module ensures the injected global name,
 * config shape, and CDN origin cannot drift between the server and browser
 * builds.
 */

/** Global the MCP app UI reads its RudderStack runtime config from. */
export const MCP_APP_TELEMETRY_GLOBAL = '__PONG_MCP_TELEMETRY__';

/** Origin the RudderStack browser SDK script is loaded from. */
export const RUDDERSTACK_CDN_ORIGIN = 'https://cdn-rs.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

/**
 * Front-end telemetry runtime config injected into an MCP app's HTML.
 *
 * Intentionally instance-level only. User-level telemetry belongs in event
 * payloads emitted by the app, not in the served HTML.
 */
export interface McpAppTelemetryConfig {
	/** Whether diagnostics are enabled. When false the UI must not load RudderStack. */
	enabled: boolean;
	/** RudderStack write key. */
	writeKey: string;
	/** Data plane URL proxied through the pong instance. */
	dataPlaneUrl: string;
	/** Source config URL proxied through the pong instance. */
	configUrl: string;
	/** Instance ID, used for event enrichment. */
	instanceId: string;
	/** pong version, used for event enrichment. */
	versionCli: string;
}
