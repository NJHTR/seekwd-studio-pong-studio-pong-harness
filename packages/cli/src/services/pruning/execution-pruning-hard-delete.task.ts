import { ExecutionsConfig } from '@pong/config';
import { Time } from '@pong/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@pong/decorators';
import type { SystemTaskSchedule } from '@pong/decorators';

import { ExecutionsPruningService } from './executions-pruning.service';

/**
 * Hard-deletes the soft-deleted executions and their binary data, draining the
 * backlog in batches within one run.
 */
@SystemTask()
export class ExecutionPruningHardDeleteTask implements SystemTask {
	readonly name = 'execution-pruning-hard-delete';

	private readonly intervalSeconds =
		this.executionsConfig.pruneDataIntervals.hardDelete * Time.minutes.toSeconds;

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(this.intervalSeconds);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// A run that is behind ends before the next occurrence is due. The drain stops
			// at the pause and returns, so the occurrence completes with result `timed_out`.
			timeoutSeconds: this.intervalSeconds,
		},
		leaderTimer: {
			// A failed run retries after one second, as the old timer did.
			retryDelaySeconds: 1,
		},
	});

	constructor(
		private readonly executionsConfig: ExecutionsConfig,
		private readonly pruningService: ExecutionsPruningService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.pruningService.hardDelete(signal);
	}
}
