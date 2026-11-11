import { Logger } from '@pong/backend-common';
import { EventService } from '@pong/backend-services';
import { Service } from '@pong/di';
import { ErrorReporter } from 'pong-core';

import { MigrationFindingSyncService } from './migration-finding-sync.service';

/**
 * Keeps the `migration_finding` table current between full scans: each time a
 * workflow is created, saved, published, unpublished, archived, or pulled from
 * source control, its findings are re-checked.
 * The module registers it only when there is a report target version.
 */
@Service()
export class MigrationFindingSyncListener {
	constructor(
		private readonly eventService: EventService,
		private readonly syncService: MigrationFindingSyncService,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	init(): void {
		this.eventService.on('workflow-created', async ({ workflow }) => {
			await this.syncWorkflow(workflow.id);
		});
		this.eventService.on('workflow-saved', async ({ workflow }) => {
			await this.syncWorkflow(workflow.id);
		});
		this.eventService.on('workflow-activated', async ({ workflowId }) => {
			await this.syncWorkflow(workflowId);
		});
		this.eventService.on('workflow-deactivated', async ({ workflowId }) => {
			await this.syncWorkflow(workflowId);
		});
		// Archiving unpublishes the workflow without a workflow-deactivated event.
		this.eventService.on('workflow-archived', async ({ workflowId }) => {
			await this.syncWorkflow(workflowId);
		});
		this.eventService.on('workflow-imported', async ({ workflowId }) => {
			await this.syncWorkflow(workflowId);
		});
	}

	// The sync service reports its own failures. This guard covers anything
	// else, so an event handler never rejects into the save path.
	private async syncWorkflow(workflowId: string): Promise<void> {
		try {
			await this.syncService.syncWorkflow(workflowId);
		} catch (error) {
			this.logger.warn('Re-detecting migration findings for a workflow failed', { workflowId });
			this.errorReporter.error(error, { extra: { workflowId } });
		}
	}
}
