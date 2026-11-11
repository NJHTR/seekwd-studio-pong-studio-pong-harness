import type { WorkflowPublishBlockedReason } from '@pong/api-types';
import { WorkflowReviewRequestRepository } from '@pong/db';
import { Service } from '@pong/di';

import { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';
import type { WorkflowPublishGuard } from '@pong/backend-services';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';

@Service()
export class WorkflowReviewPublishGuard implements WorkflowPublishGuard {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
	) {}

	async assertCanPublish(workflowId: string): Promise<void> {
		if (!(await this.featureGate.isAvailable())) return;

		const request = await this.workflowReviewRequestRepository.findOpenRequestForWorkflow(
			workflowId,
			{},
		);
		if (!request) return;

		const reason: WorkflowPublishBlockedReason =
			request.decision === 'changes_requested' ? 'changes_requested' : 'review_pending';

		throw new WorkflowPublishBlockedError({
			reason,
			workflowReviewRequestId: request.id,
		});
	}
}
