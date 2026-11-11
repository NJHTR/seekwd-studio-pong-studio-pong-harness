import { MANUAL_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';

test.describe(
	'Workflow Selector Parameter',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			const projectId = await pong.start.fromNewProjectBlankCanvas();

			const subWorkflows = [
				{ file: 'Test_Subworkflow_Get_Weather.json', name: 'Get_Weather' },
				{ file: 'Test_Subworkflow_Search_DB.json', name: 'Search_DB' },
			];

			for (const { file } of subWorkflows) {
				// Create workflow with Execute Workflow Trigger node so it can be activated
				const workflowData = {
					name: file,
					nodes: [
						{
							id: 'execute-workflow-trigger',
							name: 'When Executed by Another Workflow',
							type: 'pong-nodes-base.executeWorkflowTrigger',
							position: [0, 0] as [number, number],
							parameters: {},
							typeVersion: 1,
						},
					],
					connections: {},
					settings: {},
					active: false,
				};
				// @ts-expect-error - projectId is not part of IWorkflowBase but is accepted by the API
				workflowData.projectId = projectId;

				const workflow = await pong.api.workflows.createWorkflow(workflowData);
				// Activate the workflow so it appears in the workflow selector
				await pong.api.workflows.activate(workflow.id, workflow.versionId);
			}

			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(EXECUTE_WORKFLOW_NODE_NAME, { action: 'Execute A Sub Workflow' });
		});

		test('should show required parameter warning', async ({ pong }) => {
			await pong.ndv.openResourceLocator('workflowId');
			await expect(pong.ndv.getParameterInputIssues()).toBeVisible();
		});

		test('should filter sub-workflows list', async ({ pong }) => {
			await pong.ndvComposer.filterWorkflowList('workflowId', 'Weather');

			const items = pong.ndv.getResourceLocatorItems();

			await expect(items.filter({ hasText: 'Search DB' })).toHaveCount(0);

			await pong.ndvComposer.selectFirstFilteredWorkflow();
			const inputField = pong.ndv.getResourceLocatorInputField('workflowId');
			await expect(inputField).toHaveValue(/Get_Weather/);
		});

		test('should render sub-workflow links correctly', async ({ pong }) => {
			await pong.ndvComposer.selectWorkflowFromList('workflowId', 'Search_DB');
			const link = pong.ndv.getResourceLocatorLink('workflowId');
			await expect(link).toBeVisible();

			await pong.ndv.getExpressionModeToggle().click();
			await expect(link).toBeHidden();
		});

		test('should switch to ID mode on expression', async ({ pong }) => {
			await pong.ndvComposer.selectWorkflowFromList('workflowId', 'Search_DB');
			const modeSelector = pong.ndv.getResourceLocatorModeSelectorInput('workflowId');
			await expect(modeSelector).toHaveValue('From list');

			await pong.ndvComposer.switchToExpressionMode('workflowId');
			await expect(modeSelector).toHaveValue('By ID');
		});

		test('should render add resource option and redirect to the correct route when clicked', async ({
			pong,
		}) => {
			await pong.ndv.openResourceLocator('workflowId');

			const addResourceItem = pong.ndv.getAddResourceItem();
			await expect(addResourceItem).toHaveCount(1);
			await expect(pong.ndv.getAddResourceCreateOption()).toBeVisible();

			const secondPage = await pong.start.fromNewPage(async () => {
				await pong.ndvComposer.createNewSubworkflow('workflowId');
			});
			await expect(secondPage.canvas.nodeByName('When Executed by Another Workflow')).toBeVisible();
			await expect(secondPage.canvas.nodeByName('Replace me with your logic')).toBeVisible();
			await expect(secondPage.page).toHaveURL(/\/workflow\/.+/);
		});
	},
);
