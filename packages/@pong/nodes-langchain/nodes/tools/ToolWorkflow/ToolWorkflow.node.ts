import type { IVersionedNodeType, INodeTypeBaseDescription } from 'pong-workflow';
import { VersionedNodeType } from 'pong-workflow';

import { ToolWorkflowV1 } from './v1/ToolWorkflowV1.node';
import { ToolWorkflowV2 } from './v2/ToolWorkflowV2.node';

export class ToolWorkflow extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Call pong Sub-Workflow Tool',
			name: 'toolWorkflow',
			icon: 'node:call-pong-sub-workflow-tool',
			iconColor: 'black',
			group: ['transform'],
			description:
				'Uses another pong workflow as a tool. Allows packaging any pong node(s) as a tool.',
			codex: {
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Recommended Tools'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
						},
					],
				},
			},
			defaultVersion: 2.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new ToolWorkflowV1(baseDescription),
			1.1: new ToolWorkflowV1(baseDescription),
			1.2: new ToolWorkflowV1(baseDescription),
			1.3: new ToolWorkflowV1(baseDescription),
			2: new ToolWorkflowV2(baseDescription),
			2.1: new ToolWorkflowV2(baseDescription),
			2.2: new ToolWorkflowV2(baseDescription),
		};
		super(nodeVersions, baseDescription);
	}
}
