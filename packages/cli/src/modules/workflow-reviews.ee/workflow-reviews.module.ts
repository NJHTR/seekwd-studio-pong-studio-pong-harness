import { LICENSE_FEATURES } from '@pong/constants';
import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';
import { Container } from '@pong/di';

import { WorkflowMutationHooksProxy, WorkflowPublishGuardProxy } from '@pong/backend-services';

@BackendModule({ name: 'workflow-reviews', licenseFlag: LICENSE_FEATURES.WORKFLOW_REVIEWS })
export class WorkflowReviewsModule implements ModuleInterface {
	async init() {
		await import('./workflow-review-requests.controller.js');
		const { InboxSourceRegistry } = await import('../inbox/inbox-source.registry.js');
		const { WorkflowReviewInboxService } = await import('./workflow-review-inbox.service.js');
		const inbox = Container.get(WorkflowReviewInboxService);
		Container.get(InboxSourceRegistry).register({
			type: 'workflow_review',
			isEnabled: async () => await inbox.isInboxAvailable(),
			list: async (user, query) => await inbox.listForInbox(user, query),
			count: async (user) => await inbox.getInboxSummaryForUser(user),
		});
		const { WorkflowReviewPublishGuard } = await import(
			'./workflow-review-publish-guard.service.js'
		);
		Container.get(WorkflowPublishGuardProxy).registerProvider(
			Container.get(WorkflowReviewPublishGuard),
		);

		const { WorkflowReviewLifecycleService } = await import(
			'./workflow-review-lifecycle.service.js'
		);
		Container.get(WorkflowMutationHooksProxy).registerProvider(
			Container.get(WorkflowReviewLifecycleService),
		);
	}
}
