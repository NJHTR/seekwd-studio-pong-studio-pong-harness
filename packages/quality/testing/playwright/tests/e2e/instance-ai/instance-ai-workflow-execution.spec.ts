import type { IWorkflowBase } from 'pong-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

function seededExecutionWorkflow(name: string, setNodeName: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'manual-trigger',
				name: 'Manual Trigger',
				type: 'pong-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'set-node',
				name: setNodeName,
				type: 'pong-nodes-base.set',
				typeVersion: 3.4,
				position: [240, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'status-assignment',
								name: 'status',
								value: 'seeded',
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
			{
				id: 'terminal-node',
				name: `${setNodeName} terminal`,
				type: 'pong-nodes-base.noOp',
				typeVersion: 1,
				position: [480, 0],
				parameters: {},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: setNodeName, type: 'main', index: 0 }]],
			},
			[setNodeName]: {
				main: [[{ node: `${setNodeName} terminal`, type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

type WorkflowApiForExecutionAssertions = {
	getExecutions(workflowId: string, limit?: number): Promise<Array<{ status?: string }>>;
};

async function getSuccessfulExecutionCountForWorkflow(
	workflowsApi: WorkflowApiForExecutionAssertions,
	workflowId: string,
): Promise<number> {
	const executions = await workflowsApi.getExecutions(workflowId, 20);
	return executions.filter((execution) => execution.status === 'success').length;
}

test.describe(
	'Instance AI workflow execution',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('should show run workflow button in preview', async ({ pong }) => {
			const workflowName = 'Run Button Visibility Workflow';
			await pong.api.workflows.createWorkflow(
				seededExecutionWorkflow(workflowName, 'run button visibility test'),
			);

			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "run button visibility test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
			);

			await pong.instanceAi.waitForPreviewCanvasNode('run button visibility test');

			// The preview canvas is locked (read-only, run button hidden) while the
			// agent is working, so wait for the run to finish before asserting.
			await pong.instanceAi.waitForRunComplete(120_000);

			// The run workflow button should be visible inside the preview iframe
			await expect(pong.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});
		});

		test('should execute workflow from run button and show success indicators', async ({ pong }) => {
			test.setTimeout(180_000);
			const workflowName = 'Full Execution Workflow';
			const workflow = await pong.api.workflows.createWorkflow(
				seededExecutionWorkflow(workflowName, 'full execution test'),
			);

			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "full execution test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
			);

			await pong.instanceAi.waitForPreviewCanvasNode('full execution test');

			const executionCountBeforeRun = await getSuccessfulExecutionCountForWorkflow(
				pong.api.workflows,
				workflow.id,
			);

			// Click the run workflow button
			await pong.instanceAi.runPreviewWorkflow();

			await expect
				.poll(
					async () => await getSuccessfulExecutionCountForWorkflow(pong.api.workflows, workflow.id),
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountBeforeRun);
			await expect(
				pong.instanceAi.getPreviewNodeSuccessIndicator('full execution test'),
			).toBeVisible({ timeout: 30_000 });
		});

		test(
			'should execute individual node from node toolbar',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-show-run-workflow-button-in-preview',
					},
				],
			},
			async ({ pong }) => {
				const workflowName = 'Run Button Visibility Workflow';
				const setNodeName = 'run button visibility test';
				await pong.api.workflows.createWorkflow(seededExecutionWorkflow(workflowName, setNodeName));

				await pong.navigate.toInstanceAi();

				await pong.instanceAi.sendMessage(
					`Edit the existing workflow named "${workflowName}". Change the Set node named "${setNodeName}" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
				);

				await pong.instanceAi.waitForPreviewCanvasNode(setNodeName);

				// The node streams onto the canvas while the AI is still building; wait
				// for the run button to enable (build finished) before using the toolbar.
				await expect
					.poll(
						async () =>
							await pong.instanceAi
								.getPreviewRunWorkflowButton()
								.isEnabled()
								.catch(() => false),
						{ intervals: [500, 1_000, 2_000], timeout: 10_000 },
					)
					.toBe(true);

				// Hover the node and click the execute step button on its toolbar
				await pong.instanceAi.executePreviewNodeByName(setNodeName);

				// The node should show a success indicator after execution
				await expect(pong.instanceAi.getPreviewNodeSuccessIndicator(setNodeName)).toBeVisible({
					timeout: 30_000,
				});
			},
		);

		test('should show execution results in NDV output panel when opening node after execution', async ({
			pong,
		}) => {
			test.setTimeout(180_000);
			const workflowName = 'NDV Output Workflow';
			const workflow = await pong.api.workflows.createWorkflow(
				seededExecutionWorkflow(workflowName, 'ndv output test'),
			);

			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "ndv output test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing, do not search the web, and do not ask for clarification.`,
			);

			await pong.instanceAi.waitForPreviewCanvasNode('ndv output test');

			const executionCountBeforeRun = await getSuccessfulExecutionCountForWorkflow(
				pong.api.workflows,
				workflow.id,
			);

			// Execute the workflow
			await pong.instanceAi.runPreviewWorkflow();

			// Wait for execution to complete
			await expect
				.poll(
					async () => await getSuccessfulExecutionCountForWorkflow(pong.api.workflows, workflow.id),
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountBeforeRun);
			await expect(pong.instanceAi.getPreviewNodeSuccessIndicator('ndv output test')).toBeVisible({
				timeout: 30_000,
			});

			// Double-click the Set node to open NDV
			await pong.instanceAi.openPreviewNodeByName('ndv output test');

			// The NDV output panel should be visible with execution data
			await expect(pong.instanceAi.getPreviewNdvOutputPanel()).toBeVisible({
				timeout: 10_000,
			});
		});

		test('should allow re-running workflow after initial execution', async ({ pong }) => {
			const workflowName = 'Re-run Execution Workflow';
			const workflow = await pong.api.workflows.createWorkflow(
				seededExecutionWorkflow(workflowName, 're-run test'),
			);

			await pong.navigate.toInstanceAi();

			await pong.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "re-run test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
			);

			await pong.instanceAi.waitForPreviewCanvasNode('re-run test');

			const executionCountBeforeFirstRun = await getSuccessfulExecutionCountForWorkflow(
				pong.api.workflows,
				workflow.id,
			);

			// First execution
			await pong.instanceAi.runPreviewWorkflow();
			await expect(pong.instanceAi.getPreviewNodeSuccessIndicator('re-run test')).toBeVisible({
				timeout: 30_000,
			});

			let executionCountAfterFirstRun = executionCountBeforeFirstRun;
			await expect
				.poll(
					async () => {
						executionCountAfterFirstRun = await getSuccessfulExecutionCountForWorkflow(
							pong.api.workflows,
							workflow.id,
						);
						return executionCountAfterFirstRun;
					},
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountBeforeFirstRun);

			// Run workflow button should still be visible for re-execution
			await expect(pong.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});

			await pong.instanceAi.runPreviewWorkflow();
			await expect
				.poll(
					async () => await getSuccessfulExecutionCountForWorkflow(pong.api.workflows, workflow.id),
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountAfterFirstRun);
			await expect(pong.instanceAi.getPreviewNodeSuccessIndicator('re-run test')).toBeVisible({
				timeout: 10_000,
			});
		});
	},
);
