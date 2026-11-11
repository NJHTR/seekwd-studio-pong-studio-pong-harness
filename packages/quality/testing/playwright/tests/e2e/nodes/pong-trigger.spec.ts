import { workflow, trigger, node } from '@pong/workflow-sdk';
import type { INode, IWorkflowBase } from 'pong-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

// The node emits from `trigger()` at registration time, so its events depend on
// how the publication path (re)registers triggers. Run against the publication
// service, which becomes the default.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'pong-trigger-publication-service',
			PONG_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			// Activation is applied asynchronously by the publication outbox
			// consumer, so poll frequently to keep the test fast.
			PONG_WORKFLOW_PUBLICATION_OUTBOX_POLL_INTERVAL_MS: '250',
		},
	},
});

type TriggerEventType = 'activate' | 'update';

const makePongTriggerWorkflow = (events: TriggerEventType[]) => {
	const pongTrigger = trigger({
		type: 'pong-nodes-base.pongTrigger',
		version: 1,
		config: {
			name: 'pong Trigger',
			parameters: { events },
		},
	});

	const noOp = node({
		type: 'pong-nodes-base.noOp',
		version: 1,
		config: {
			name: 'NoOp',
		},
	});

	return workflow(nanoid(), `pong Trigger Test ${nanoid()}`).add(pongTrigger.to(noOp));
};

test.describe(
	'pong Trigger node',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fire "activate" event when workflow is published', async ({ api }) => {
			const wf = makePongTriggerWorkflow(['activate']);
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			// First activation — activationMode = 'activate'
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const execution = await api.workflows.waitForExecution(workflowId, 15_000, 'trigger');
			expect(execution.status).toBe('success');
		});

		test('should fire "update" event when active workflow is re-published', async ({ api }) => {
			const wf = makePongTriggerWorkflow(['update']);
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				wf.toJSON() as IWorkflowBase,
			);

			// First activation — activationMode = 'activate', trigger should NOT fire
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Update the workflow nodes to create a new version (simulates editing)
			const updatedNodes = wf.add(
				node({ type: 'pong-nodes-base.noOp', version: 1, config: { name: 'NoOp2' } }),
			);
			const updatedWorkflow = await api.workflows.update(workflowId, createdWorkflow.versionId!, {
				nodes: updatedNodes.toJSON().nodes as INode[],
			});

			// Re-activation with new version — activationMode = 'update', trigger should fire
			await api.workflows.activate(workflowId, updatedWorkflow.versionId!);

			const execution = await api.workflows.waitForExecution(workflowId, 15_000, 'trigger');
			expect(execution.status).toBe('success');
		});
	},
);
