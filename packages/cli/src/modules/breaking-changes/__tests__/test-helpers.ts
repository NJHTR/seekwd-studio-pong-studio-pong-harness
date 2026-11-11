import type { WorkflowEntity } from '@pong/db';
import type { INode } from 'pong-workflow';

export const createWorkflow = (id: string, name: string, nodes: INode[], active = true) => ({
	workflow: {
		id,
		name,
		active,
		activeVersionId: active ? 'v1' : null,
		versionId: 'v1',
		nodes,
	} as WorkflowEntity,
	nodesGroupedByType: nodes.reduce((map, node) => {
		if (!map.has(node.type)) {
			map.set(node.type, []);
		}
		map.get(node.type)!.push(node);
		return map;
	}, new Map<string, INode[]>()),
});

export const createNode = (name: string, type: string, parameters: unknown = {}): INode => ({
	id: `node-${name}`,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: parameters as INode['parameters'],
});
