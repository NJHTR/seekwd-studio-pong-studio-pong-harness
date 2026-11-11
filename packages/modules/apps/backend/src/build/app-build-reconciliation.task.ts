import { clusterTarget, intervalFromSeconds, SystemTask } from '@pong/decorators';
import type { SystemTaskSchedule } from '@pong/decorators';

import { AppVersionRepository } from '../versions/app-version.repository';
import { AppsConfig } from '../apps.config';

@SystemTask()
export class AppBuildReconciliationTask implements SystemTask {
	readonly name = 'app-build-reconciliation';
	readonly schedule: SystemTaskSchedule = intervalFromSeconds(60);
	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: { retryDelaySeconds: 60 },
	});

	constructor(
		private readonly versions: AppVersionRepository,
		private readonly config: AppsConfig,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		signal.throwIfAborted();
		const now = Date.now();
		await this.versions.failInterruptedBuilds(
			new Date(now - this.config.buildStartTimeoutMs),
			new Date(now - this.config.buildTimeoutMs),
		);
	}
}
