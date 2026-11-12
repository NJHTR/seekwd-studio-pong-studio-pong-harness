import { createHash } from 'node:crypto';

import type { JsonValue } from '@pong/easycode-runtime';

import { toJsonValue } from './easycode-json';

import type { SystemAgentHostEventEmitter } from '../system-agent-host-events';
import type {
	EasycodeApprovalDecision,
	EasycodeApprovalRequest,
	EasycodeDynamicToolCall,
	EasycodeDynamicToolResult,
} from './easycode-supervisor.port';

export interface EasycodeDynamicToolContext {
	threadId: string;
	turnId: string;
	callId: string;
}

export interface EasycodeDynamicTool {
	name: string;
	description: string;
	/** JSON Schema of the arguments. */
	inputSchema: JsonValue;
	/** Ask the user before the tool runs. Use it for tools with side effects. */
	requiresApproval?: boolean;
	handler: (args: unknown, context: EasycodeDynamicToolContext) => Promise<string>;
}

/** The approval path of the dynamic tools, supplied by the turn's approval bridge. */
export interface EasycodeDynamicToolApprover {
	ask(request: EasycodeApprovalRequest): Promise<EasycodeApprovalDecision>;
}

export interface EasycodeDynamicToolsetOptions {
	threadId: string;
	tools: readonly EasycodeDynamicTool[];
	approver?: EasycodeDynamicToolApprover;
	emit?: SystemAgentHostEventEmitter;
}

export interface EasycodeDynamicToolSpec {
	type: 'function';
	name: string;
	description: string;
	inputSchema: JsonValue;
}

/**
 * The pong tools that easyCode may call, exposed through `dynamicTools`.
 *
 * The toolset is a pure function of the tool list: the specs and their hash are
 * stable, so a resume can compare the hash and fork a thread when the toolset
 * changed. A side-effecting tool asks the approval bridge first; the same
 * decision path and audit as the command approvals apply.
 */
export class EasycodeDynamicToolset {
	private readonly byName: Map<string, EasycodeDynamicTool>;

	private readonly specsValue: EasycodeDynamicToolSpec[];

	private readonly hashValue: string;

	constructor(private readonly options: EasycodeDynamicToolsetOptions) {
		this.byName = new Map(options.tools.map((tool) => [tool.name, tool]));
		this.specsValue = options.tools.map((tool) => ({
			type: 'function',
			name: tool.name,
			description: tool.description,
			inputSchema: tool.inputSchema,
		}));
		this.hashValue = createHash('sha256').update(stableStringify(this.specsValue)).digest('hex');
	}

	specs(): EasycodeDynamicToolSpec[] {
		return this.specsValue;
	}

	hash(): string {
		return this.hashValue;
	}

	async handle(call: EasycodeDynamicToolCall): Promise<EasycodeDynamicToolResult> {
		const tool = this.byName.get(call.tool);
		if (tool === undefined) {
			return { success: false, text: `Unknown dynamic tool "${call.tool}".` };
		}
		if (tool.requiresApproval === true && this.options.approver !== undefined) {
			const decision = await this.options.approver.ask({
				approvalId: `dynamic-tool:${call.callId}`,
				kind: 'dynamicTool',
				threadId: call.threadId,
				turnId: call.turnId,
				itemId: call.callId,
				command: call.tool,
				reason: describeArgs(call.arguments),
			});
			if (decision !== 'accept' && decision !== 'acceptForSession') {
				return { success: false, text: `The user declined the tool "${call.tool}".` };
			}
		}
		this.options.emit?.(
			'easycode-dynamic-tool',
			{ tool: call.tool, callId: call.callId, arguments: toJsonValue(call.arguments) },
			{ key: `dynamic-tool:${call.callId}` },
		);
		try {
			const text = await tool.handler(call.arguments, {
				threadId: call.threadId,
				turnId: call.turnId,
				callId: call.callId,
			});
			return { success: true, text };
		} catch (error) {
			return {
				success: false,
				text: error instanceof Error ? error.message : String(error),
			};
		}
	}
}

export interface EasycodeDynamicToolApproverHolder {
	specs(): EasycodeDynamicToolSpec[];
	hash(): string;
	handle(call: EasycodeDynamicToolCall): Promise<EasycodeDynamicToolResult>;
}

function describeArgs(args: unknown): string {
	try {
		const text = JSON.stringify(args);
		return text.length > 200 ? `${text.slice(0, 200)}…` : text;
	} catch {
		return 'dynamic tool call';
	}
}

/** Sorted JSON, so the toolset hash does not depend on the object key order. */
export function stableStringify(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
		return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
	}
	return JSON.stringify(value) ?? 'null';
}
