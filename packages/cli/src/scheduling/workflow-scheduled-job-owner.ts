import { ScheduledJobOwnerType } from '@pong/constants';
import type { ScheduledJobOwner, ScheduledJobOwnerRef } from '@pong/db';
import { WorkflowPublishedVersionRepository } from '@pong/db';
import { Service } from '@pong/di';

import type { ScheduledJobOwnerResolver } from '@pong/scheduler';

/**
 * Marks a workflow as the owner of the scheduled jobs its trigger nodes create.
 * For reconciliation, a workflow still exists while it has a published version.
 */
@Service()
export class WorkflowScheduledJobOwner implements ScheduledJobOwnerResolver {
	readonly ownerType = ScheduledJobOwnerType.Workflow;

	constructor(private readonly publishedVersions: WorkflowPublishedVersionRepository) {}

	/** The owner of the jobs one trigger node provisions. */
	member(workflowId: string, nodeId: string): ScheduledJobOwner {
		return { ownerType: this.ownerType, ownerId: workflowId, ownerMemberId: nodeId };
	}

	/** The owner of every job the workflow holds, whichever node provisioned it. */
	ref(workflowId: string): ScheduledJobOwnerRef {
		return { ownerType: this.ownerType, ownerId: workflowId };
	}

	async findExisting(ownerIds: string[]): Promise<Set<string>> {
		return await this.publishedVersions.findPublishedWorkflowIds(ownerIds);
	}
}
