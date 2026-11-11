import { DatabaseConfig, statementTimeoutSeconds } from '@pong/config';
import { Time } from '@pong/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@pong/decorators';
import type { SystemTaskSchedule } from '@pong/decorators';

import { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager';

/** Deletes workflow versions older than the retention period, except the ones a workflow still points to. */
@SystemTask()
export class WorkflowHistoryPruningTask implements SystemTask {
	readonly name = 'workflow-history-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// The signal stops the run only between batches, so the timeout waits for a statement to end.
			timeoutSeconds: timeoutAfterLimit(
				statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
		leaderTimer: {
			// Only the leader prunes, so a new leader runs once at takeover instead of waiting an hour.
			runOnTakeover: true,
		},
	});

	constructor(
		private readonly databaseConfig: DatabaseConfig,
		private readonly workflowHistoryManager: WorkflowHistoryManager,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.workflowHistoryManager.prune(signal);
	}
}
