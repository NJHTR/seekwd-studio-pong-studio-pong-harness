import type { AuthenticatedRequest } from '@pong/db';
import { Post, ProjectScope, RestController } from '@pong/decorators';

import { AppPreviewService } from './app-preview.service';

type PreviewRequest = AuthenticatedRequest<{ projectId: string; appId: string; versionId: string }>;

@RestController('/projects/:projectId/apps/:appId/versions/:versionId/preview')
export class AppPreviewController {
	constructor(private readonly preview: AppPreviewService) {}

	@Post('/')
	@ProjectScope('app:read')
	async createGrant(req: PreviewRequest) {
		const { projectId, appId, versionId } = req.params;
		return await this.preview.createGrant(req.user.id, projectId, appId, versionId);
	}
}
