import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@pong/api-types';
import type { WorkflowEntity } from '@pong/db';
import { BreakingChangeRule } from '@pong/decorators';
import type { INode } from 'pong-workflow';

import { reportAffectedNodes } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

export const AI_TRANSFORM_NODE_TYPE = 'pong-nodes-base.aiTransform';

@BreakingChangeRule({ version: 'v3' })
export class AiTransformDeprecatedRule implements IBreakingChangeWorkflowRule {
	id: string = 'ai-transform-deprecated';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'AI Transform node is deprecated',
			description:
				'The AI Transform node is deprecated. Its generated code runs as a Code node instead.',
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
			assistant: 'fix',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Replace AI Transform with a Code node',
				description:
					'The AI Transform node runs its generated JavaScript in the same sandbox as the Code node. Migrate it to a Code node to keep it working.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = nodesGroupedByType.get(AI_TRANSFORM_NODE_TYPE) ?? [];

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' uses the deprecated AI Transform node`,
			description:
				'The AI Transform node is deprecated. Migrate it to a Code node to keep it working.',
			level: 'warning',
		}));
	}
}
