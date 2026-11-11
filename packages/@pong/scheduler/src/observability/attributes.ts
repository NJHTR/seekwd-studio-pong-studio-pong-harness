import type { RecordedOccurrence } from '../core/materializer';
import type { ClaimedTask } from '../core/types';

/**
 * `pong.scheduler.*` span attribute names, kept in one place so every scheduler
 * span reports the same keys and Sentry queries stay stable.
 */
export const SCHEDULER_ATTRIBUTES = {
	taskId: 'pong.scheduler.task_id',
	jobId: 'pong.scheduler.job_id',
	taskType: 'pong.scheduler.task_type',
	host: 'pong.scheduler.host',
	leaseEpoch: 'pong.scheduler.lease_epoch',
	scheduledFor: 'pong.scheduler.scheduled_for',
	runAt: 'pong.scheduler.run_at',
	attempts: 'pong.scheduler.attempts',
	maxAttempts: 'pong.scheduler.max_attempts',
	outcome: 'pong.scheduler.outcome',
	claimedCount: 'pong.scheduler.claimed_count',
	reclaimed: 'pong.scheduler.reclaimed',
	deadLettered: 'pong.scheduler.dead_lettered',
	claimedJobs: 'pong.scheduler.claimed_jobs',
	occurrences: 'pong.scheduler.occurrences',
	deferredJobs: 'pong.scheduler.deferred_jobs',
	skippedOccurrences: 'pong.scheduler.skipped_occurrences',
	retiredOccurrences: 'pong.scheduler.retired_occurrences',
	missed: 'pong.scheduler.missed',
	retentionDeleted: 'pong.scheduler.retention_deleted',
	retentionDrained: 'pong.scheduler.retention_drained',
	ownersChecked: 'pong.scheduler.owners_checked',
	quarantinedJobs: 'pong.scheduler.quarantined_jobs',
	deletedOrphanedJobs: 'pong.scheduler.deleted_orphaned_jobs',
	revivedJobs: 'pong.scheduler.revived_jobs',
	reconciliationDrained: 'pong.scheduler.reconciliation_drained',
	provisionInserted: 'pong.scheduler.provision_inserted',
	provisionRedefined: 'pong.scheduler.provision_redefined',
	provisionUnchanged: 'pong.scheduler.provision_unchanged',
	provisionRemoved: 'pong.scheduler.provision_removed',
	deprovisionRemoved: 'pong.scheduler.deprovision_removed',
	jobName: 'pong.scheduler.job_name',
	jobAction: 'pong.scheduler.job_action',
} as const;

/**
 * Values of the {@link SCHEDULER_ATTRIBUTES.jobAction} attribute on a per-job
 * provision span: what one provision did to that job, so a trace tells a fresh
 * insert apart from a rewrite apart from a deletion. Unchanged jobs get no span.
 */
export const SCHEDULER_PROVISION_ACTION = {
	/** The job did not exist and was inserted. */
	inserted: 'inserted',
	/** The job existed with a different definition and was rewritten in place. */
	redefined: 'redefined',
	/** The job was no longer desired and was deleted. */
	removed: 'removed',
} as const;

/**
 * Values of the {@link SCHEDULER_ATTRIBUTES.outcome} attribute on a fire span:
 * how firing one task ended, so a trace tells a retry apart from a terminal
 * dead-letter and both apart from a skip.
 */
export const SCHEDULER_FIRE_OUTCOME = {
	/** The handler ran and the task completed. */
	completed: 'completed',
	/** The handler threw and the task was rescheduled for another attempt. */
	rescheduled: 'rescheduled',
	/** The handler threw on its last attempt and the task failed terminally. */
	deadLettered: 'dead_lettered',
	/** No handler was registered for the type; the claim was released. */
	skippedNoHandler: 'skipped_no_handler',
	/** The row was gone or reclaimed by the time it fired; nothing dispatched. */
	skippedNotOwned: 'skipped_not_owned',
} as const;

/** The `job_id` + `task_id` + `task_type` triple every scheduler task span carries. */
export function pickSchedulerTaskIdentity(
	task: RecordedOccurrence,
): Record<string, string | number> {
	return {
		[SCHEDULER_ATTRIBUTES.taskId]: task.id,
		[SCHEDULER_ATTRIBUTES.jobId]: task.jobId,
		[SCHEDULER_ATTRIBUTES.taskType]: task.taskType,
	};
}

/**
 * The full per-occurrence attributes of a fire span: the identity plus this
 * attempt's lease, attempt counts and instants. Spans that carry the identity
 * alone use {@link pickSchedulerTaskIdentity}.
 */
export function pickSchedulerTaskAttributes(task: ClaimedTask): Record<string, string | number> {
	return {
		...pickSchedulerTaskIdentity(task),
		[SCHEDULER_ATTRIBUTES.leaseEpoch]: task.leaseEpoch,
		[SCHEDULER_ATTRIBUTES.attempts]: task.attempts,
		[SCHEDULER_ATTRIBUTES.maxAttempts]: task.maxAttempts,
		[SCHEDULER_ATTRIBUTES.scheduledFor]: task.scheduledFor.toISOString(),
		[SCHEDULER_ATTRIBUTES.runAt]: task.runAt.toISOString(),
	};
}
