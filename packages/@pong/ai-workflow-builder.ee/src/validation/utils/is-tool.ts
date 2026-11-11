import type { INodeTypeDescription } from 'pong-workflow';

export function isTool(nodeType: INodeTypeDescription): boolean {
	return nodeType.codex?.subcategories?.AI?.includes('Tools') ?? false;
}
