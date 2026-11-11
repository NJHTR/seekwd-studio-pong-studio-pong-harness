/**
 * Workflow Import Utility
 *
 * Parses pong JSON format into internal graph structures.
 */

import { deepCopy } from 'pong-workflow';

import {
	foldLegacyErrorConnections,
	normalizeConnections,
	generateUniqueName,
	type AuthoredNodeGroup,
	type FromJSONOptions,
	type WorkflowJSON,
	type NodeInstance,
	type GraphNode,
	type ConnectionTarget,
	type IDataObject,
	type CredentialReference,
	type NewCredentialValue,
	type DeclaredConnection,
	type InputTarget,
} from '../types/base';
import { assertSingleErrorHandler, isInputTarget } from './node-builders/node-builder';

/**
 * Result of parsing a workflow JSON
 */
export interface ParsedWorkflow {
	readonly id: string;
	readonly name: string;
	readonly settings?: Record<string, unknown>;
	readonly nodes: Map<string, GraphNode>;
	readonly lastNode: string | null;
	readonly pinData?: Record<string, IDataObject[]>;
	readonly meta?: { templateId?: string; instanceId?: string; [key: string]: unknown };
	/** Node groups reconstructed by mapping the JSON's member IDs back to node handles. */
	readonly nodeGroups?: AuthoredNodeGroup[];
}

/**
 * Parse workflow JSON into internal graph structures.
 * This is a pure function that doesn't depend on WorkflowBuilderImpl.
 */
export function parseWorkflowJSON(json: WorkflowJSON, options?: FromJSONOptions): ParsedWorkflow {
	const nodes = new Map<string, GraphNode>();
	// Map from connection name (how nodes reference each other) to map key
	const nameToKey = new Map<string, string>();
	// Map from pong node ID to the created node handle, used to rebuild groups (which
	// reference members by ID) as node refs — the same shape `.group()` authoring uses.
	const idToInstance = new Map<string, NodeInstance<string, string, unknown>>();

	// Create node instances from JSON (shallow-clone each node to avoid mutating the input)
	let unnamedCounter = 0;
	for (const rawNode of json.nodes) {
		const pongNode = { ...rawNode };
		// Normalize typeVersion to number (some workflows store it as a string)
		if (typeof pongNode.typeVersion === 'string') {
			pongNode.typeVersion = Number(pongNode.typeVersion);
		}
		const version = `v${pongNode.typeVersion}`;

		// Preserve original credentials exactly - don't transform
		const credentials = pongNode.credentials
			? (deepCopy(pongNode.credentials) as Record<string, CredentialReference | NewCredentialValue>)
			: undefined;

		// For nodes without a name (like sticky notes), use the id as the internal name
		const nodeName = pongNode.name ?? pongNode.id;
		const declaredOutputs = options?.declaredOutputs;
		// Own keys only: a node named like a prototype key (`constructor`) has no output.
		const output =
			pongNode.name && declaredOutputs && Object.hasOwn(declaredOutputs, pongNode.name)
				? declaredOutputs[pongNode.name]
				: undefined;
		// An imported handle builds no connections of its own — the builder wires the graph.
		// An error route is the exception: recording it like an authored node does is what
		// gives the handler's chain or composite the usual expansion.
		const declaredConnections: DeclaredConnection[] = [];
		const instance: NodeInstance<string, string, unknown> = {
			type: pongNode.type,
			version,
			id: pongNode.id,
			name: nodeName,
			config: {
				name: nodeName,
				parameters: pongNode.parameters,
				credentials,
				...({ _originalName: pongNode.name } as Record<string, unknown>),
				position: pongNode.position,
				webhookId: pongNode.webhookId,
				disabled: pongNode.disabled,
				notes: pongNode.notes,
				notesInFlow: pongNode.notesInFlow,
				executeOnce: pongNode.executeOnce,
				retryOnFail: pongNode.retryOnFail,
				maxTries: pongNode.maxTries,
				waitBetweenTries: pongNode.waitBetweenTries,
				alwaysOutputData: pongNode.alwaysOutputData,
				onError: pongNode.onError,
				extendsCredential: pongNode.extendsCredential,
				customTelemetryTags: pongNode.customTelemetryTags,
				...(output ? { output } : {}),
			},
			update(config) {
				return { ...this, config: { ...this.config, ...config } };
			},
			to() {
				throw new Error('Nodes from fromJSON() do not support to()');
			},
			input() {
				throw new Error('Nodes from fromJSON() do not support input()');
			},
			output() {
				throw new Error('Nodes from fromJSON() do not support output()');
			},
			onError(handler: NodeInstance<string, string, unknown> | InputTarget) {
				assertSingleErrorHandler(handler);
				// The route wins over the saved value, the same way it does on an authored
				// node: a node that continues on its regular output has no error pin to
				// route from. A node the builder never routes from keeps what it imported.
				this.config.onError = 'continueErrorOutput';
				declaredConnections.push(
					isInputTarget(handler)
						? {
								target: handler.node,
								outputIndex: 0,
								targetInputIndex: handler.inputIndex,
								connectionType: 'error',
							}
						: { target: handler, outputIndex: 0, connectionType: 'error' },
				);
				return this;
			},
			getConnections() {
				return [...declaredConnections];
			},
		};

		const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();
		let mapKey = nodeName || `__unnamed_${unnamedCounter++}`;

		// Handle duplicate node names: generate unique key for duplicates
		// The first instance keeps the original name (connections reference it)
		if (nodes.has(mapKey)) {
			mapKey = generateUniqueName(nodeName, (n) => nodes.has(n));
		} else {
			nameToKey.set(nodeName, mapKey);
		}

		nodes.set(mapKey, {
			instance,
			connections: connectionsMap,
		});

		// Groups reference members by ID; record ID → handle so we can carry groups as
		// node refs (resolved back to IDs in toJSON, exactly like authored groups).
		if (pongNode.id) idToInstance.set(pongNode.id, instance);
	}

	// Rebuild connections (deep-clone to avoid mutating the input)
	if (json.connections) {
		const connections = deepCopy(json.connections);
		normalizeConnections(connections);
		foldLegacyErrorConnections(connections, json.nodes);

		for (const [sourceName, nodeConns] of Object.entries(connections)) {
			const mapKey = nameToKey.get(sourceName);
			const graphNode = mapKey ? nodes.get(mapKey) : undefined;
			if (!graphNode) {
				continue;
			}

			for (const [connType, outputs] of Object.entries(nodeConns)) {
				if (!outputs || !Array.isArray(outputs)) {
					continue;
				}

				const typeMap =
					graphNode.connections.get(connType) ?? new Map<number, ConnectionTarget[]>();

				for (let outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
					const targets = outputs[outputIndex];
					if (targets && targets.length > 0) {
						typeMap.set(
							outputIndex,
							targets.map((conn: { node: string; type: string; index: number }) => ({
								node: conn.node,
								type: conn.type,
								index: conn.index,
							})),
						);
					} else {
						typeMap.set(outputIndex, []);
					}
				}

				graphNode.connections.set(connType, typeMap);
			}
		}
	}

	let lastNode: string | null = null;
	for (const name of nodes.keys()) {
		lastNode = name;
	}

	const nodeGroups = json.nodeGroups?.length
		? json.nodeGroups.map((group) => ({
				id: group.id,
				name: group.name,
				description: group.description,
				members: group.nodeIds.flatMap((id) => {
					const instance = idToInstance.get(id);
					return instance !== undefined ? [instance] : [];
				}),
			}))
		: undefined;

	return {
		id: json.id ?? '',
		name: json.name,
		settings: json.settings,
		nodes,
		lastNode,
		pinData: json.pinData,
		meta: json.meta,
		nodeGroups,
	};
}
