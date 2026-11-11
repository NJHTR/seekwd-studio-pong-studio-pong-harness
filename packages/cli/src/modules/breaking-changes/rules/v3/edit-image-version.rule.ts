import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@pong/api-types';
import type { WorkflowEntity } from '@pong/db';
import { BreakingChangeRule } from '@pong/decorators';
import type { INode } from 'pong-workflow';

import {
	collectEditImageWarnings,
	EDIT_IMAGE_TARGET_VERSION,
	getLegacyEditImageNodes,
} from './edit-image-version';
import { reportAffectedNodes } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class EditImageVersionRule implements IBreakingChangeWorkflowRule {
	id = 'edit-image-version-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Edit Image versions below 2 are removed',
			description:
				'pong 3.0 removes Edit Image versions 1 and 1.1, so workflows that use them fail. Upgrade each node to version 2. Version 2 uses a different image library, so some operations can change output shape or appearance.',
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Upgrade Edit Image nodes to version 2',
				description: 'Run the automatic migration, or migrate manually.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = getLegacyEditImageNodes(nodesGroupedByType);

		return reportAffectedNodes(affectedNodes, (node) => {
			const warnings = collectEditImageWarnings(node.parameters);
			return {
				title: `Node '${node.name}' uses Edit Image version ${node.typeVersion}`,
				description: [
					`Upgrade this node to version ${EDIT_IMAGE_TARGET_VERSION}.`,
					...warnings,
				].join(' '),
				level: 'error',
			};
		});
	}
}
