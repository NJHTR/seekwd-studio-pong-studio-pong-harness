import { AuthenticatedRequest } from '@pong/db';
import { Delete, Param, ProjectScope, RestController } from '@pong/decorators';
import { Response } from 'express';

import { TestWebhooks } from '@/webhooks/test-webhooks';

@RestController('/test-webhook')
export class TestWebhooksController {
	constructor(private readonly testWebhooks: TestWebhooks) {}

	@Delete('/:workflowId')
	@ProjectScope('workflow:execute')
	async cancel(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		await this.testWebhooks.cancelWebhook(workflowId);
	}
}
