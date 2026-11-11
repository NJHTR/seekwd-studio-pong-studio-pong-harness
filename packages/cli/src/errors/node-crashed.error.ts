import type { INode } from 'pong-workflow';
import { NodeOperationError } from 'pong-workflow';

export class NodeCrashedError extends NodeOperationError {
	constructor(node: INode) {
		super(node, 'Node crashed, possible out-of-memory issue', {
			message: 'Execution stopped at this node',
			description:
				"pong may have run out of memory while running this execution. More context and tips on how to avoid this <a href='https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' target='_blank'>in the docs</a>",
		});
	}
}
