import type { INode, INodeType, INodeTypeDescription } from 'pong-workflow';
import { NodeConnectionTypes } from 'pong-workflow';
import { UnexpectedError } from '@pong/errors';
import { mock } from 'vitest-mock-extended';

import type { NodeTypesProxy } from '@pong/backend-services';

import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { AlwaysOutputDataMultiOutputRule } from '../always-output-data-multi-output.rule';

const NODE_TYPE_OUTPUTS: Record<string, INodeTypeDescription['outputs']> = {
	'pong-nodes-base.httpRequest': [NodeConnectionTypes.Main],
	'pong-nodes-base.filter': [NodeConnectionTypes.Main],
	'pong-nodes-base.if': [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
	'pong-nodes-base.compareDatasets': [
		{ type: NodeConnectionTypes.Main, displayName: 'In A only' },
		{ type: NodeConnectionTypes.Main, displayName: 'Same' },
		{ type: NodeConnectionTypes.Main, displayName: 'Different' },
		{ type: NodeConnectionTypes.Main, displayName: 'In B only' },
	],
	'pong-nodes-base.switch': '={{ [] }}',
	'@pong/nodes-langchain.memoryBufferWindow': [NodeConnectionTypes.AiMemory],
	'pong-nodes-awesome-package.router': [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
};

const nodeTypes = mock<NodeTypesProxy>();
nodeTypes.getByNameAndVersion.mockImplementation((type) => {
	const outputs = NODE_TYPE_OUTPUTS[type];
	if (outputs === undefined) throw new UnexpectedError('Unknown node type');
	return { description: { outputs } } as INodeType;
});

const withAlwaysOutputData = (name: string, type: string): INode => ({
	...createNode(name, type),
	alwaysOutputData: true,
});

describe('AlwaysOutputDataMultiOutputRule', () => {
	const rule = new AlwaysOutputDataMultiOutputRule(nodeTypes);

	describe('detectWorkflow()', () => {
		it('should not flag single-output nodes even with Always Output Data on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Filter', 'pong-nodes-base.filter'),
				withAlwaysOutputData('HTTP', 'pong-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not flag a multi-output node with Always Output Data off', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('If', 'pong-nodes-base.if'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it.each([
			['static outputs', 'pong-nodes-base.if'],
			['static output configurations', 'pong-nodes-base.compareDatasets'],
			['dynamic outputs', 'pong-nodes-base.switch'],
		])('should flag a multi-output node (%s) with Always Output Data on', async (_, type) => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Node', type),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].nodeName).toBe('Node');
		});

		it('should flag a multi-output community node with Always Output Data on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Router', 'pong-nodes-awesome-package.router'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Router');
		});

		it('should flag a single-output node with an error output and Always Output Data on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...withAlwaysOutputData('HTTP', 'pong-nodes-base.httpRequest'),
					onError: 'continueErrorOutput',
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('HTTP');
		});

		it('should not flag nodes without main outputs', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Memory', '@pong/nodes-langchain.memoryBufferWindow'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not flag nodes whose type is not installed', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Uninstalled', 'pong-nodes-uninstalled-package.gone'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should flag only the multi-output nodes that have the setting on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('IfOn', 'pong-nodes-base.if'),
				createNode('IfOff', 'pong-nodes-base.if'),
				withAlwaysOutputData('SwitchOn', 'pong-nodes-base.switch'),
				withAlwaysOutputData('FilterOn', 'pong-nodes-base.filter'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues.map((issue) => issue.nodeName).sort()).toEqual(['IfOn', 'SwitchOn']);
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend reviewing nodes that use Always Output Data', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toContain('Always Output Data');
		});
	});
});
