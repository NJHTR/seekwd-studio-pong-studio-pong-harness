/**
 * easyCode app-server runtime for pong.
 *
 * The package owns the stdio protocol client, the process supervisor, and the
 * approval broker. The host (system agent provider) supplies approval and
 * dynamic tool callbacks and persists events from the notification queue.
 *
 * Locked against the easyCode binary described by `runtime.lock.json`.
 * Regenerate and diff the protocol surface with `scripts/schema-diff.mjs`.
 */

export { ApprovalBroker } from './approval';
export type {
	ApprovalBrokerOptions,
	ApprovalDecision,
	ApprovalKind,
	ApprovalRecord,
	ApprovalStats,
	PendingApprovalView,
} from './approval';
export {
	HandshakeError,
	ProtocolError,
	RequestTimeoutError,
	TransportClosedError,
} from './errors';
export * from './protocol';
export {
	AppServerSupervisor,
	resolveDefaultExePath,
	SupervisorInitError,
} from './supervisor';
export type {
	ApprovalHostRequest,
	EasyCodeHomeMode,
	EasyCodeHomePlan,
	HealthReport,
	InterruptOutcome,
	InterruptStatus,
	JobObject,
	ShutdownResult,
	StartTurnOptions,
	SupervisorEvents,
	SupervisorLogger,
	SupervisorOptions,
	SupervisorState,
} from './supervisor';
export {
	BoundedQueue,
	JsonlTransport,
	LineDecoder,
	RemoteProtocolError,
} from './transport';
export type {
	CloseListener,
	JsonlTransportOptions,
	NotificationListener,
	ProtocolErrorListener,
	RequestOptions,
	ResponseParser,
	ServerRequestListener,
	TransportStats,
} from './transport';
