import type { FailedAttemptHandler } from '@langchain/core/utils/async_caller';
import type { ISupplyDataFunctions, JsonObject } from 'pong-workflow';
import { NodeApiError } from 'pong-workflow';

import { pongDefaultFailedAttemptHandler } from './pongDefaultFailedAttemptHandler';

/**
 * This function returns a custom failed attempt handler for using with LangChain models.
 * It first tries to use a custom handler passed as an argument, and if that doesn't throw an error, it uses the default handler.
 * It throws a NodeApiError only when a handler rejects the error.
 * Otherwise it returns, and AsyncCaller retries with backoff.
 */
export const makePongLlmFailedAttemptHandler = (
	ctx: ISupplyDataFunctions,
	handler?: FailedAttemptHandler,
): FailedAttemptHandler => {
	return (error: any) => {
		try {
			// Try custom error handler first
			handler?.(error);

			// If it didn't throw an error, use the default handler
			pongDefaultFailedAttemptHandler(error);
		} catch (e) {
			// Wrap the error in a NodeApiError
			const apiError = new NodeApiError(ctx.getNode(), e as JsonObject, {
				functionality: 'configuration-node',
			});

			throw apiError;
		}
	};
};
