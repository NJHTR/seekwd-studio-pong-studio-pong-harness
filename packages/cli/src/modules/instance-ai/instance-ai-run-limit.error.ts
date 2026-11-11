import type { InstanceAiRunLimitMeta } from '@pong/api-types';

import { TooManyRequestsError } from '@pong/errors';

/**
 * A new user turn was refused because a concurrency cap was already full.
 *
 * Carries a machine-readable reason so the editor can distinguish "the instance is busy"
 * (transient, retry is right) from "you already have runs going" (retry is wrong), which
 * need different copy. `meta` reaches the client via `serializeInternalRestError`.
 */
export class InstanceAiRunLimitError extends TooManyRequestsError {
	constructor(
		message: string,
		readonly meta: InstanceAiRunLimitMeta,
	) {
		super(message);
		this.name = 'InstanceAiRunLimitError';
	}
}
