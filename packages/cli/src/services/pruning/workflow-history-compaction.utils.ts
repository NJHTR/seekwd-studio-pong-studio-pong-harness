import type { GlobalConfig, WorkflowHistoryCompactionConfig } from '@pong/config';
import { Time } from '@pong/constants';

export function getCompactionWindowDeltas(minimumAge: number, timeWindow: number, unitMs: number) {
	return { startDelta: (minimumAge + timeWindow) * unitMs, endDelta: minimumAge * unitMs };
}

/** A prune horizon shorter than the trim window makes trimming pointless. */
export function isTrimmingEnabled(
	workflowHistory: GlobalConfig['workflowHistory'],
	compaction: WorkflowHistoryCompactionConfig,
): boolean {
	return (
		workflowHistory.pruneTime === -1 ||
		workflowHistory.pruneTime * Time.hours.toMilliseconds >=
			compaction.trimmingMinimumAgeDays * Time.days.toMilliseconds
	);
}
