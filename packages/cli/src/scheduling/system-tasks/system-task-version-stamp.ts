import { gt, valid } from 'semver';

import { PONG_VERSION } from '@/constants';

/** The payload of every system task job: the pong version that last provisioned it. */
export type SystemTaskJobPayload = { pongVersion: string };

export function versionStamp(): SystemTaskJobPayload {
	return { pongVersion: PONG_VERSION };
}

/** Whether a stored payload was stamped by a version newer than this one. */
export function stampedByNewerVersion(payload: Record<string, unknown>): boolean {
	const { pongVersion } = payload;
	return (
		typeof pongVersion === 'string' && valid(pongVersion) !== null && gt(pongVersion, PONG_VERSION)
	);
}
