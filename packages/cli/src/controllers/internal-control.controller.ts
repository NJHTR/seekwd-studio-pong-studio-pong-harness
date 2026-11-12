import { Get, Middleware, Post, RootLevelController } from '@pong/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ControlPlaneService } from '@/services/control-plane.service';

/**
 * Loopback control plane for the desktop supervisor.
 *
 * The routes sit on the root path and are registered before the editor's
 * catch-all, so an unknown `/internal/control/*` request never gets the SPA
 * page. `@Middleware` runs the shared secret check for every route.
 */
@RootLevelController('/internal/control')
export class InternalControlController {
	constructor(private readonly controlPlane: ControlPlaneService) {}

	@Middleware()
	authorizeControlAccess(req: Request, res: Response, next: NextFunction): void {
		switch (this.controlPlane.authorize(req)) {
			case 'accepted':
				next();
				return;
			case 'not-configured':
				// The endpoints do not exist until an operator sets a token.
				res.status(404).end();
				return;
			case 'not-loopback':
				res.status(403).json({ code: 403, message: 'Forbidden' });
				return;
			case 'invalid-token':
				res.status(401).json({ code: 401, message: 'Unauthorized' });
				return;
		}
	}

	@Get('/health', { skipAuth: true })
	async health(_req: Request, res: Response): Promise<void> {
		res.status(200).json(this.controlPlane.health());
	}

	@Post('/shutdown', { skipAuth: true })
	async shutdown(_req: Request, res: Response): Promise<void> {
		// Start the graceful shutdown only after the 202 reaches the caller.
		res.once('finish', () => {
			this.controlPlane.requestShutdown();
		});

		res.status(202).json({ accepted: true });
	}
}
