import type { INodeTypeDescription } from 'pong-workflow';
import { mock } from 'vitest-mock-extended';

import type { SimpleWorkflow } from '@/types';

import { evaluateTrigger } from './trigger';

describe('evaluateTrigger', () => {
	const mockNodeTypes: INodeTypeDescription[] = [
		mock<INodeTypeDescription>({
			name: 'pong-nodes-base.manualTrigger',
			displayName: 'Manual Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'pong-nodes-base.webhookTrigger',
			displayName: 'Webhook Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'pong-nodes-base.scheduleTrigger',
			displayName: 'Schedule Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'pong-nodes-base.executeWorkflowTrigger',
			displayName: 'Execute Workflow Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
			maxNodes: 1,
		}),
		mock<INodeTypeDescription>({
			name: 'pong-nodes-base.code',
			displayName: 'Code',
			group: ['transform'],
			inputs: ['main'],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'pong-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			group: ['transform'],
			inputs: ['main'],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'pong-nodes-base.set',
			displayName: 'Set',
			group: ['input'],
			inputs: ['main'],
			outputs: ['main'],
		}),
	];

	describe('basic trigger validation', () => {
		it('should return no violations for workflow with no nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Empty Workflow',
				nodes: [],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);

			expect(result.violations).toEqual([]);
		});

		it('should detect workflow with no trigger nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'No Trigger Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code',
						type: 'pong-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'pong-nodes-base.httpRequest',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);

			expect(result.violations).toContainEqual(
				expect.objectContaining({
					description: 'Workflow must have at least one trigger node to start execution',
				}),
			);
		});

		it('should accept workflow with one trigger node', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Valid Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'pong-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Code',
						type: 'pong-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);

			expect(result.violations).toEqual([]);
		});
	});

	describe('edge cases', () => {
		it('should handle unknown node types gracefully', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Unknown Node Workflow',
				nodes: [
					{
						id: '1',
						name: 'Unknown Trigger',
						type: 'pong-nodes-base.unknownTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Manual Trigger',
						type: 'pong-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);
			expect(result.violations).toEqual([]);
		});

		it('should handle mixed trigger and non-trigger nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Mixed Workflow',
				nodes: [
					{
						id: '1',
						name: 'Set Data',
						type: 'pong-nodes-base.set',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Webhook',
						type: 'pong-nodes-base.webhookTrigger',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
					{
						id: '3',
						name: 'Process',
						type: 'pong-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [400, 0],
					},
					{
						id: '4',
						name: 'Manual',
						type: 'pong-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 200],
					},
					{
						id: '5',
						name: 'HTTP Call',
						type: 'pong-nodes-base.httpRequest',
						parameters: {},
						typeVersion: 1,
						position: [600, 0],
					},
				],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);
			expect(result.violations).toEqual([]);
		});
	});
});
