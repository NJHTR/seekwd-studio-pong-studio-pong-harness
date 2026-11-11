import type { ExecutionStatus } from 'pong-workflow';

export const DEBUG_PAYWALL_MODAL_KEY = 'debugPaywall';

/** Execution statuses that are in progress and can be stopped from the executions list. */
export const CANCELLABLE_EXECUTION_STATUSES = [
	'new',
	'running',
	'waiting',
] as const satisfies readonly ExecutionStatus[];
