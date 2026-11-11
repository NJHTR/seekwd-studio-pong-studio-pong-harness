import { WorkflowHistoryCompactionConfig } from '@pong/config';
import { Time } from '@pong/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@pong/decorators';
import type { SystemTaskSchedule } from '@pong/decorators';

import { WorkflowHistoryCompactionService } from './workflow-history-compaction.service';

/**
 * Removes redundant recent workflow history versions, so auto-saves that hold
 * no meaningful change do not bloat the history table.
 */
@SystemTask()
export class WorkflowHistoryCompactionOptimizeTask implements SystemTask {
	readonly name = 'workflow-history-compaction-optimize';

	// Optimization runs twice per optimizing window, so first and last versions
	// of a window are covered redundantly across restarts and small gaps.
	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		(this.config.optimizingTimeWindowHours / 2) * Time.hours.toSeconds,
	);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// A run takes 7 to 13 minutes on a large instance, and the workflows it does not
			// reach get only one more run.
			timeoutSeconds: 30 * Time.minutes.toSeconds,
		},
	});

	constructor(
		private readonly config: WorkflowHistoryCompactionConfig,
		private readonly compactionService: WorkflowHistoryCompactionService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.compactionService.optimizeHistories(signal);
	}
}
