import { Logger } from '@pong/backend-common';
import { EventService } from '@pong/backend-services';
import { WorkflowsConfig } from '@pong/config';
import { Time } from '@pong/constants';
import { WorkflowPublicationOutboxRepository } from '@pong/db';
import { Service } from '@pong/di';
import { SpanStatus, Tracing } from 'pong-core';

import type { PublicationOperationResult } from '@/events/maps/workflow-publication-metrics.event-map';

/**
 * Deletes terminal workflow publication outbox records so the table doesn't grow
 * unbounded (one terminal row per publish/unpublish, plus one per active workflow
 * on every leader startup). Terminal rows have no functional readers - they're a
 * short-lived diagnostic trail - so `completed` rows are pruned quickly while
 * `failed`/`partial_success` rows (which carry an error message) are kept longer.
 * Active records are never touched. The cadence, the startup pass and the abort
 * on stepdown or shutdown live on the `publication-outbox-cleanup` system task.
 */
@Service()
export class WorkflowPublicationOutboxCleanupService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly tracing: Tracing,
		private readonly eventService: EventService,
	) {
		this.logger = logger.scoped('workflow-publication');
	}

	/**
	 * One bounded cleanup pass over terminal outbox rows. A failed batch rejects the
	 * pass, so the caller decides on the retry. An aborted `signal` stops the pass
	 * after the current batch.
	 */
	async cleanup(signal: AbortSignal) {
		const completedRetentionSeconds =
			this.workflowsConfig.publicationOutboxCompletedRetentionHours * Time.hours.toSeconds;
		const failedRetentionSeconds =
			this.workflowsConfig.publicationOutboxFailedRetentionHours * Time.hours.toSeconds;
		const batchSize = this.workflowsConfig.publicationOutboxCleanupBatchSize;

		const startedAt = Date.now();
		await this.tracing.startSpan(
			{ name: 'Publication outbox cleanup', op: 'publication.outbox.cleanup' },
			async (span) => {
				let totalDeleted = 0;
				let result: PublicationOperationResult = 'failure';
				try {
					let deleted: number;
					do {
						deleted = await this.outboxRepository.deleteTerminalOlderThan(
							completedRetentionSeconds,
							failedRetentionSeconds,
							batchSize,
						);
						totalDeleted += deleted;
					} while (deleted >= batchSize && !signal.aborted);

					result = 'success';
					span.setStatus({ code: SpanStatus.ok });

					if (totalDeleted > 0) {
						this.logger.debug('Cleaned up terminal workflow publication outbox records', {
							count: totalDeleted,
						});
					}
				} finally {
					span.setAttribute('pong.publication.records_deleted', totalDeleted);
					this.eventService.emit('workflow-publication-outbox-cleanup', {
						result,
						deletedCount: totalDeleted,
						durationMs: Date.now() - startedAt,
					});
				}
			},
		);
	}
}
