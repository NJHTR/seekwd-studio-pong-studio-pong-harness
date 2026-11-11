import { GetQuickConnectApiKeyDto } from '@pong/api-types';
import type { AuthenticatedRequest } from '@pong/db';
import { Body, Post, RestController } from '@pong/decorators';

import { QuickConnectService } from './quick-connect.service';

@RestController('/quick-connect')
export class QuickConnectController {
	constructor(private readonly quickConnectService: QuickConnectService) {}

	@Post('/')
	async getCredentialData(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: GetQuickConnectApiKeyDto,
	) {
		return await this.quickConnectService.getCredentialData(body.quickConnectType, req.user);
	}
}
