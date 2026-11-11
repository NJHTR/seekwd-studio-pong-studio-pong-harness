import { Time } from '@pong/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@pong/decorators';
import type { SystemTaskSchedule } from '@pong/decorators';

import { InsightsCompactionService } from './insights-compaction.service';
import { InsightsConfig } from './insights.config';

/**
 * Rolls raw insight events up into per-period summaries, so the insights
 * dashboards stay fast and the stored data stays small.
 */
@SystemTask()
export class InsightsCompactionTask implements SystemTask {
	readonly name = 'insights-compaction';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		this.insightsConfig.compactionIntervalMinutes * Time.minutes.toSeconds,
	);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// The compaction budget plus the batch in flight when it runs out.
			timeoutSeconds: timeoutAfterLimit(
				this.insightsConfig.compactionMaxRuntimeSeconds,
				5 * Time.minutes.toSeconds,
			),
		},
	});

	constructor(
		private readonly insightsConfig: InsightsConfig,
		private readonly compactionService: InsightsCompactionService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.compactionService.compactInsights(signal);
	}
}
