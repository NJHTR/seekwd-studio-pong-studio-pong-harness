import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Editor zoom should work after route changes',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should maintain zoom functionality after switching between Editor and Workflow history and Workflow list', async ({
			pong,
		}) => {
			// ~10 full canvas reloads of a large workflow. Under CI load each reload can take
			// 5-15s, so the default 60s budget times out at whichever step is running.
			test.setTimeout(180_000);

			await pong.api.enableFeature('debugInEditor');
			await pong.api.enableFeature('workflowHistory');
			const { createdWorkflow } = await pong.start.fromImportedWorkflow('Lots_of_nodes.json');
			const workflowName = createdWorkflow.name;

			await expect(pong.canvas.getCanvasNodes().first()).toBeVisible();
			const initialNodeCount = await pong.canvas.getCanvasNodes().count();
			expect(initialNodeCount).toBeGreaterThan(0);

			await pong.canvasComposer.switchBetweenEditorAndHistory();
			await pong.canvasComposer.zoomInAndCheckNodes();

			await pong.canvasComposer.switchBetweenEditorAndHistory();
			await pong.canvasComposer.switchBetweenEditorAndHistory();
			await pong.canvasComposer.zoomInAndCheckNodes();

			await pong.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
			await pong.canvasComposer.zoomInAndCheckNodes();

			await pong.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
			await pong.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
			await pong.canvasComposer.zoomInAndCheckNodes();

			await pong.canvasComposer.switchBetweenEditorAndHistory();
			await pong.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
		});
	},
);
