import type { IWorkflowBase } from 'pong-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
const APPROVE_EDIT_WORKFLOW_NAME = 'INS-171 Approval Edit Target';
const DENY_EDIT_WORKFLOW_NAME = 'INS-171 Deny Edit Target';
const APPROVE_EDIT_WORKFLOW_ID = 'hC397S83USUp9597';
const DENY_EDIT_WORKFLOW_ID = 'cK6nyU9IZfas3ZKe';
const RESTORE_ARCHIVED_WORKFLOW_NAME = 'INS-199 Archived Restore Target';
const RESTORE_ARCHIVED_WORKFLOW_ID = 'ins-199-archived-restore-target';
const INITIAL_STATUS_VALUE = 'before approval';
const APPROVED_STATUS_VALUE = 'approved edit was applied';
const DENIED_STATUS_VALUE = 'denied edit should not apply';

type WorkflowWithArchiveState = IWorkflowBase & { isArchived?: boolean };

function seededEditableWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'manual',
				name: 'Manual Trigger',
				type: 'pong-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'status-marker',
				name: 'Status Marker',
				type: 'pong-nodes-base.set',
				typeVersion: 3.4,
				position: [240, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'status-assignment',
								name: 'status',
								value: INITIAL_STATUS_VALUE,
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Status Marker', type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

function workflowSignature(workflow: IWorkflowBase): string {
	return JSON.stringify({
		nodes: workflow.nodes,
		connections: workflow.connections,
	});
}

test.describe(
	'Instance AI confirmations',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test.beforeEach(async ({ api }) => {
			await api.setInstanceAiPermissions({
				runWorkflow: 'require_approval',
				updateWorkflow: 'require_approval',
			});
		});

		test('should list archived workflows and restore one via Instance AI', async ({
			api,
			pong,
			pongContainer,
		}) => {
			test.skip(!pongContainer, 'LLM replay requires the container proxy harness');

			await api.setInstanceAiPermissions({
				deleteWorkflow: 'always_allow',
			});

			try {
				const workflow = await pong.api.workflows.createWorkflow({
					id: RESTORE_ARCHIVED_WORKFLOW_ID,
					...seededEditableWorkflow(RESTORE_ARCHIVED_WORKFLOW_NAME),
				});
				expect(workflow.id).toBe(RESTORE_ARCHIVED_WORKFLOW_ID);
				await pong.api.workflows.archive(workflow.id);

				await expect
					.poll(async () => {
						const archivedWorkflow = (await pong.api.workflows.getWorkflow(
							workflow.id,
						)) as WorkflowWithArchiveState;
						return archivedWorkflow.isArchived;
					})
					.toBe(true);

				const prompt = `Restore the archived workflow named "${RESTORE_ARCHIVED_WORKFLOW_NAME}".`;

				await pong.navigate.toInstanceAi();
				await pong.instanceAi.sendMessage(prompt);
				await pong.instanceAi.waitForResponseComplete();
				await expect(pong.instanceAi.getAssistantMessageText(/restored/i)).toBeVisible();
				await expect
					.poll(async () => {
						const restoredWorkflow = (await pong.api.workflows.getWorkflow(
							workflow.id,
						)) as WorkflowWithArchiveState;
						return restoredWorkflow.isArchived;
					})
					.toBe(false);
			} finally {
				// Settings are merged, not replaced — reset deleteWorkflow so the
				// override does not leak into later tests in this describe block.
				await api.setInstanceAiPermissions({
					deleteWorkflow: 'require_approval',
				});
			}
		});

		// The ticket's autonomous "similar workflow" edit and this explicit edit both
		// converge on workflow_builder_build_workflow with a workflowId before the update is saved.
		test('should require approval before editing an existing workflow and apply after approval', async ({
			api,
			pong,
		}, testInfo) => {
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Post-approval agent actions are not yet stable on the multi-main project',
			);

			await api.setInstanceAiPermissions({
				runWorkflow: 'always_allow',
			});

			const workflow = await pong.api.workflows.createWorkflow({
				id: APPROVE_EDIT_WORKFLOW_ID,
				...seededEditableWorkflow(APPROVE_EDIT_WORKFLOW_NAME),
			});
			const beforeEdit = await pong.api.workflows.getWorkflow(workflow.id);
			const beforeEditSignature = workflowSignature(beforeEdit);

			await pong.navigate.toInstanceAi();
			await pong.instanceAi.sendMessage(
				`Edit the existing workflow named "${APPROVE_EDIT_WORKFLOW_NAME}". Change the Set node named "Status Marker" so the "status" field value is exactly "${APPROVED_STATUS_VALUE}". Do not create a new workflow.`,
			);

			await expect(pong.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			const whileAwaitingApproval = await pong.api.workflows.getWorkflow(workflow.id);
			expect(workflowSignature(whileAwaitingApproval)).toBe(beforeEditSignature);

			await pong.instanceAi.getConfirmApproveButton().click();

			let approvedUpdate = false;
			await expect
				.poll(
					async () => {
						if (
							!approvedUpdate &&
							(await pong.instanceAi
								.getConfirmationText(`Update workflow "${APPROVE_EDIT_WORKFLOW_NAME}"`)
								.isVisible()
								.catch(() => false))
						) {
							await pong.instanceAi.getConfirmApproveButton().click();
							approvedUpdate = true;
						}

						const updated = await pong.api.workflows.getWorkflow(workflow.id);
						return workflowSignature(updated);
					},
					{ timeout: 180_000 },
				)
				.toContain(APPROVED_STATUS_VALUE);
			await pong.instanceAi.waitForResponseComplete();
		});

		test('should require approval before editing an existing workflow and keep it unchanged when denied', async ({
			pong,
		}) => {
			const workflow = await pong.api.workflows.createWorkflow({
				id: DENY_EDIT_WORKFLOW_ID,
				...seededEditableWorkflow(DENY_EDIT_WORKFLOW_NAME),
			});
			const beforeEdit = await pong.api.workflows.getWorkflow(workflow.id);
			const beforeEditSignature = workflowSignature(beforeEdit);

			await pong.navigate.toInstanceAi();
			await pong.instanceAi.sendMessage(
				`Edit the existing workflow named "${DENY_EDIT_WORKFLOW_NAME}". Change the Set node named "Status Marker" so the "status" field value is exactly "${DENIED_STATUS_VALUE}". Do not create a new workflow.`,
			);

			await expect(pong.instanceAi.getConfirmDenyButton()).toBeVisible({ timeout: 120_000 });
			await pong.instanceAi.getConfirmDenyButton().click();
			await pong.instanceAi.waitForResponseComplete();

			const afterDeny = await pong.api.workflows.getWorkflow(workflow.id);
			expect(workflowSignature(afterDeny)).toBe(beforeEditSignature);
		});
	},
);
