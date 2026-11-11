import type { INode } from 'pong-workflow';
import { NodeOperationError } from 'pong-workflow';

export class UninspectableSubworkflowSourceError extends NodeOperationError {
	constructor(node: INode) {
		super(
			node,
			`The '${node.name}' node loads its sub-workflow from a source that is resolved only when the workflow runs, so its credential access cannot be checked on save. Use the "Database" source, or enter fixed JSON in the "Define Below" source.`,
		);
	}
}
