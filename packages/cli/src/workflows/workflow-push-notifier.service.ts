import type { PushMessage } from '@pong/api-types';
import { Service } from '@pong/di';

import { Push } from '@/push';
import { WorkflowSharingService } from '@pong/backend-services';

/** Sends a push message only to users who can currently read the workflow it concerns. */
@Service()
export class WorkflowPushNotifier {
	constructor(
		private readonly push: Push,
		private readonly workflowSharingService: WorkflowSharingService,
	) {}

	async notify(workflowId: string, pushMsg: PushMessage) {
		const userIds =
			await this.workflowSharingService.getUserIdsWithAccessToWorkflowSafe(workflowId);
		this.push.sendToUsers(pushMsg, userIds);
	}
}
