import type { Logger } from '@pong/backend-common';
import type { EngineConfig } from '@pong/config';
import type { ActionScope } from '@pong/engine';
import { InvalidActionTokenError, verifyActionToken } from '@pong/engine';
import type { NextFunction, Request, Response } from 'express';

import { UnauthenticatedError } from '@pong/errors';

const BEARER_PREFIX = /^bearer /i;

/** Express's `RequestHandler` may return a promise; verifying a token never does. */
type SyncRequestHandler = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Rejects a caller the shared secret does not vouch for, and a caller whose
 * token was minted for another scope. Reads the secret per request, because it
 * is generated after this is constructed.
 */
export function createEngineControlPlaneAuthMiddleware(
	engineConfig: EngineConfig,
	logger: Logger,
	requiredScope: ActionScope,
): SyncRequestHandler {
	const reject = (req: Request, res: Response, reason: string): void => {
		// Logged, never returned: an operator needs the reason, a caller must not.
		logger.warn(`Rejected ${req.method} ${req.originalUrl} - ${reason}`);
		const error = new UnauthenticatedError();
		res.status(error.httpStatusCode).json({ code: error.errorCode, message: error.message });
	};

	return (req, res, next) => {
		const header = req.header('authorization') ?? '';
		if (!BEARER_PREFIX.test(header)) {
			reject(req, res, 'no bearer token');
			return;
		}

		try {
			verifyActionToken(engineConfig.authSecret, header.replace(BEARER_PREFIX, ''), requiredScope);
		} catch (error) {
			if (!(error instanceof InvalidActionTokenError)) throw error;
			reject(req, res, 'token rejected');
			return;
		}

		next();
	};
}
