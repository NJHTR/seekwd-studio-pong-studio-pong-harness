import type { AiPreferenceScope } from '@pong/api-types';

import { BadRequestError } from '@pong/errors';

/** The per-scope cap refused a preference write. `meta` stays out of the REST body. */
export class AiPreferenceScopeFullError extends BadRequestError {
	override readonly metaIsInternal = true;

	constructor(
		scope: AiPreferenceScope,
		readonly meta: { limit: number; actual: number },
	) {
		super(`A ${scope} cannot hold more than ${meta.limit} preferences`);
		this.name = 'AiPreferenceScopeFullError';
	}
}
