/**
 * Packages whose node type definitions are generated to disk at build time.
 * These names are also reserved and cannot be installed as community packages.
 */
export const BUILTIN_NODES_PACKAGES = ['pong-nodes-base', '@pong/nodes-langchain'] as const;

/**
 * Longest accepted workflow node id, and the width of every column that stores one.
 * pong generates UUIDs (36 characters). The rest leaves room for readable ids that
 * API and source control clients supply.
 */
export const NODE_ID_MAX_LENGTH = 64;

/**
 * Whether `nodeId` is too long to store in the columns keyed on node ids.
 * Counts unicode code points to match PostgreSQL's `varchar(n)` behavior on UTF-8.
 */
export const isNodeIdTooLong = (nodeId: string): boolean => [...nodeId].length > NODE_ID_MAX_LENGTH;

/**
 * Built-in node types that need a backend module to run, keyed to that module.
 * The node panel and the AI builder offer them only while the module is enabled.
 * Workflows that already use them still load, and the node fails with a clear error.
 */
export const MODULE_GATED_NODE_TYPES = {
	'pong-nodes-base.dataTable': 'data-table',
	'pong-nodes-base.dataTableTool': 'data-table',
	'pong-nodes-base.messageAnAgent': 'agents',
	'pong-nodes-base.messageAnAgentTool': 'agents',
} as const;

export type ModuleGatedNodeType = keyof typeof MODULE_GATED_NODE_TYPES;
export type NodeGatingModule = (typeof MODULE_GATED_NODE_TYPES)[ModuleGatedNodeType];

export const isModuleGatedNodeType = (nodeType: string): nodeType is ModuleGatedNodeType =>
	Object.hasOwn(MODULE_GATED_NODE_TYPES, nodeType);

/** The module that `nodeType` needs, or `undefined` when it needs none. */
export function getNodeGatingModule(nodeType: string): NodeGatingModule | undefined {
	return isModuleGatedNodeType(nodeType) ? MODULE_GATED_NODE_TYPES[nodeType] : undefined;
}
