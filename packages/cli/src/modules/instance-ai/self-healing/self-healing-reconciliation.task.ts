import { Time } from '@pong/constants';
import { clusterTarget, intervalFromMilliseconds, SystemTask } from '@pong/decorators';
import type { SystemTaskSchedule } from '@pong/decorators';

import { SelfHealingInvestigationService } from './self-healing-investigation.service';

/** Release interrupted investigations without delaying Assistant cleanup. */
@SystemTask()
export class SelfHealingReconciliationTask implements SystemTask {
	readonly name = 'self-healing-reconciliation';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(Time.minutes.toMilliseconds);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
	});

	constructor(private readonly investigations: SelfHealingInvestigationService) {}

	async run(signal: AbortSignal): Promise<void> {
		if (signal.aborted) return;
		await this.investigations.reconcile(signal);
	}
}
