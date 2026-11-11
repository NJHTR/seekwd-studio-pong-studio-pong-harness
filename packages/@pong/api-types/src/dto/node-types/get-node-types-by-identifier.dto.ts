import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Schema for node type identifier in the format "name@version"
 * e.g., "pong-nodes-base.httpRequest@4.2" or "pong-nodes-base.if@2"
 */
const nodeTypeIdentifierSchema = z
	.string()
	.regex(
		/^[\w.-]+@\d+(\.\d+)?(\.\d+)?$/,
		'Invalid node type identifier format. Expected "name@version"',
	);

export class GetNodeTypesByIdentifierRequestDto extends Z.class({
	/**
	 * Array of node type identifiers in the format "name@version"
	 * e.g., ["pong-nodes-base.httpRequest@4.2", "pong-nodes-base.if@2"]
	 */
	identifiers: z.array(nodeTypeIdentifierSchema).min(1).max(1000),
}) {}
