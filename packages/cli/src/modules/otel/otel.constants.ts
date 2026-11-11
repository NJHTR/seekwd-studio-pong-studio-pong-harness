import { OTLP_PROTOCOLS, type OtlpProtocol } from '@pong/api-types';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export { OTLP_PROTOCOLS, type OtlpProtocol };

export const OTEL_ENV_VARS = {
	enabled: 'PONG_OTEL_ENABLED',
	exporterProtocol: 'PONG_OTEL_EXPORTER_OTLP_PROTOCOL',
	exporterEndpoint: 'PONG_OTEL_EXPORTER_OTLP_ENDPOINT',
	exporterTracingPath: 'PONG_OTEL_EXPORTER_OTLP_TRACING_PATH',
	exporterHeaders: 'PONG_OTEL_EXPORTER_OTLP_HEADERS',
	exporterServiceName: 'PONG_OTEL_EXPORTER_SERVICE_NAME',
	tracesSampleRate: 'PONG_OTEL_TRACES_SAMPLE_RATE',
	startupConnectivityTimeoutMs: 'PONG_OTEL_STARTUP_CONNECTIVITY_TIMEOUT_MS',
	includeNodeSpans: 'PONG_OTEL_TRACES_INCLUDE_NODE_SPANS',
	emitWorkflowStartSpan: 'PONG_OTEL_TRACES_EMIT_WORKFLOW_START_SPAN',
	emitNodeStartSpan: 'PONG_OTEL_TRACES_EMIT_NODE_START_SPAN',
	injectOutbound: 'PONG_OTEL_TRACES_INJECT_OUTBOUND',
	productionExecutionsOnly: 'PONG_OTEL_TRACES_PRODUCTION_ONLY',
} as const;

export const CUSTOM_ATTRIBUTE_PREFIXES_ENV_VAR = 'PONG_OTEL_TRACES_CUSTOM_ATTRIBUTE_PREFIXES';
const RESERVED_BAGGAGE_KEY_PREFIX = 'pong.';

export function isReservedBaggageKey(key: string): boolean {
	return key.toLowerCase().startsWith(RESERVED_BAGGAGE_KEY_PREFIX);
}

export const DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES = {
	project: 'pong.project.custom.',
	workflow: 'pong.workflow.custom.',
	node: 'pong.node.custom.',
} as const;

export const OTEL_TEST_SPAN_NAME = 'pong.test_trace';

export const ATTR = {
	OTEL_SERVICE_NAME: ATTR_SERVICE_NAME,
	OTEL_SERVICE_VERSION: ATTR_SERVICE_VERSION,

	INSTANCE_ID: 'pong.instance.id',
	INSTANCE_ROLE: 'pong.instance.role',

	IS_TEST_TRACE: 'pong.test',

	PROJECT_ID: 'pong.project.id',
	PROJECT_NAME: 'pong.project.name',

	WORKFLOW_ID: 'pong.workflow.id',
	WORKFLOW_VERSION_ID: 'pong.workflow.version_id',
	WORKFLOW_NAME: 'pong.workflow.name',
	WORKFLOW_NODE_COUNT: 'pong.workflow.node_count',

	EXECUTION_ID: 'pong.execution.id',
	EXECUTION_MODE: 'pong.execution.mode',
	EXECUTION_STATUS: 'pong.execution.status',
	EXECUTION_IS_RETRY: 'pong.execution.is_retry',
	EXECUTION_RETRY_OF: 'pong.execution.retry_of',
	EXECUTION_ERROR_TYPE: 'pong.execution.error_type',
	EXECUTION_CRASH_DETECTOR: 'pong.execution.crash.detector',
	EXECUTION_RECONSTRUCTED: 'pong.execution.reconstructed',

	NODE_ID: 'pong.node.id',
	NODE_NAME: 'pong.node.name',
	NODE_TYPE: 'pong.node.type',
	NODE_TYPE_VERSION: 'pong.node.type_version',
	NODE_ITEMS_INPUT: 'pong.node.items.input',
	NODE_ITEMS_OUTPUT: 'pong.node.items.output',
	NODE_TERMINATION_REASON: 'pong.node.termination_reason',

	CONTINUATION_REASON: 'pong.continuation.reason',
} as const;

export const BUILT_IN_ATTRIBUTE_KEYS: ReadonlySet<string> = new Set(Object.values(ATTR));
