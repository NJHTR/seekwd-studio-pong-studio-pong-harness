import { DatabaseConfig, ExecutionsConfig, statementTimeoutSeconds } from '@pong/config';
import { Time } from '@pong/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@pong/decorators';
import type { SystemTaskSchedule } from '@pong/decorators';

import { ExecutionsPruningService } from './executions-pruning.service';

/**
 * Soft-deletes executions past the configured max age or count, marking them
 * for the hard-deletion cycle that removes them and their binary data.
 */
@SystemTask()
export class ExecutionPruningSoftDeleteTask implements SystemTask {
	readonly name = 'execution-pruning-soft-delete';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		this.executionsConfig.pruneDataIntervals.softDelete * Time.minutes.toSeconds,
	);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// One UPDATE that ignores the signal. A timeout that stops the run before the
			// UPDATE ends lets the next run start a second one, so it waits for the
			// statement timeout first.
			timeoutSeconds: timeoutAfterLimit(
				statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
	});

	constructor(
		private readonly executionsConfig: ExecutionsConfig,
		private readonly databaseConfig: DatabaseConfig,
		private readonly pruningService: ExecutionsPruningService,
	) {}

	async run(): Promise<void> {
		await this.pruningService.softDelete();
	}
}
