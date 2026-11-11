import { PONG_NODES_API_VERSION } from '@pong/constants';
import { formatNodesApiLevel, parseNodesApiLevel } from '@pong/utils/nodes-api-level';

export { PONG_NODES_API_VERSION, formatNodesApiLevel, parseNodesApiLevel };

/** Minimal package.json shape needed to check node API compatibility. */
export interface NodesApiVersionPackageJson {
	pong?: {
		pongNodesApiVersion?: unknown;
	};
}

export type NodesApiVersionCheck =
	| { compatible: true }
	| {
			compatible: false;
			reason: 'malformed';
			declared: unknown;
	  }
	| {
			compatible: false;
			reason: 'unsupported';
			declared: unknown;
			/** As `<major>.<minor>`, for messages and metadata. */
			required: string;
	  };

function supportedLevel() {
	const level = parseNodesApiLevel(PONG_NODES_API_VERSION);
	if (level === null)
		throw new Error(`PONG_NODES_API_VERSION is not a level: ${PONG_NODES_API_VERSION}`);
	return level;
}

// A missing declaration is a legacy package at level 1. A malformed one is
// incompatible: the runtime cannot tell an old package from a corrupt one.
export function checkNodesApiVersion(pkgJson: NodesApiVersionPackageJson): NodesApiVersionCheck {
	const declared = pkgJson?.pong?.pongNodesApiVersion;

	if (declared === undefined) return { compatible: true };

	const required = parseNodesApiLevel(declared);
	if (required === null) return { compatible: false, reason: 'malformed', declared };

	if (required.compare(supportedLevel()) <= 0) return { compatible: true };

	return {
		compatible: false,
		reason: 'unsupported',
		declared,
		required: formatNodesApiLevel(required),
	};
}
