import { BreakingChangeRecommendation } from '@pong/api-types';
import { WorkflowEntity } from '@pong/db';
import { BreakingChangeRule } from '@pong/decorators';
import { INode } from 'pong-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v2' })
export class ProcessEnvAccessRule implements IBreakingChangeWorkflowRule {
	id: string = 'process-env-access-v2';
	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Block process.env Access in Expressions and Code nodes',
			description: 'Direct access to process.env is blocked by default for security',
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
			documentationUrl:
				'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		};
	}

	async detectWorkflow(
		workflow: WorkflowEntity,
		_nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		// If PONG_BLOCK_ENV_ACCESS_IN_NODE is explicitly set, then the instance is not affected
		// because the user has already made a choice
		if (process.env.PONG_BLOCK_ENV_ACCESS_IN_NODE) {
			return {
				isAffected: false,
				issues: [],
			};
		}

		// Match process.env with optional whitespace, newlines, comments between 'process' and '.env'
		// This covers: process.env, process  .env, process/* comment */.env, process\n.env, etc.
		// Also matches optional chaining: process?.env
		const processEnvPattern = /process\s*(?:\/\*[\s\S]*?\*\/)?\s*\??\.?\s*env\b/;

		const affectedNodes: Array<{ nodeId: string; nodeName: string }> = [];

		workflow.nodes.forEach((node) => {
			// Check in Code nodes
			if (node.type === 'pong-nodes-base.code') {
				const code = typeof node.parameters?.code === 'string' ? node.parameters.code : undefined;
				if (code && processEnvPattern.test(code)) {
					affectedNodes.push({ nodeId: node.id, nodeName: node.name });
				}
			} else {
				// Check in expressions
				const nodeJson = JSON.stringify(node.parameters ?? {});
				if (processEnvPattern.test(nodeJson) && !affectedNodes.some((n) => n.nodeId === node.id)) {
					affectedNodes.push({ nodeId: node.id, nodeName: node.name });
				}
			}
		});

		return {
			isAffected: affectedNodes.length > 0,
			issues:
				affectedNodes.map((n) => ({
					title: 'process.env access detected',
					description: `Node with name '${n.nodeName}' accesses process.env which is blocked by default for security reasons.`,
					level: 'error',
					nodeId: n.nodeId,
					nodeName: n.nodeName,
				})) || [],
		};
	}

	async getRecommendations(): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Remove process.env usage',
				description: 'Replace process.env with environment variables configured in pong',
			},
			{
				action: 'Enable access if required',
				description: 'Set PONG_BLOCK_ENV_ACCESS_IN_NODE=false to allow access',
			},
		];
	}
}
