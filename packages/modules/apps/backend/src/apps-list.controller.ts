import { ListAppsQueryDto } from '@pong/api-types';
import type { AuthenticatedRequest } from '@pong/db';
import { Get, Query, RestController } from '@pong/decorators';
import type { Response } from 'express';

import { AppsService } from './apps.service';

@RestController('/apps')
export class AppsListController {
	constructor(private readonly appsService: AppsService) {}

	@Get('/')
	// The service checks app:list per project because this route has no project ID.
	async list(req: AuthenticatedRequest, res: Response, @Query query: ListAppsQueryDto) {
		res.json(await this.appsService.listAppsForUser(req.user, query));
	}
}
