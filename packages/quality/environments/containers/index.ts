/**
 * pong Test Containers
 *
 * This package provides container management utilities for pong testing.
 * Services are accessed via pongContainer.services.* in tests.
 */

// Stack orchestration - primary public API
export { createPONGStack } from './stack';
export type { PONGConfig, PONGStack } from './stack';

export { consumeStartupFailure } from './startup-diagnostics';
export type { PONGStartupDiagnostics } from './services/pong';

// K3s + Helm chart stack - for Kubernetes deployment validation
export { createHelmStack } from './helm-stack';
export type { HelmStack, HelmStackConfig, HelmStackMode } from './helm-stack';

// Service-only stack (no pong containers) - for integration tests
export {
	createServiceStack,
	collectExternalEnv,
	devEnvFilePath,
	writeDevEnvFile,
} from './service-stack';

export type { StackTelemetryRecord } from './telemetry';

// Performance plans (CLI-only)
export * from './performance-plans';

// Types used externally by tests
export { type LogEntry, type MetricsHelper } from './services/observability';
export { type GiteaHelper } from './services/gitea';
export { KafkaHelper } from './services/kafka';
