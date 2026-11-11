import type { IWorkflowBase } from 'pong-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

// A deprecated node can only exist in a workflow created before the node was
// deprecated. The backend blocks creating such workflows, so disable that guard
// for this test to seed the fixture. The editor's frozen-node behaviour is
// driven by the node description and is independent of this flag.
test.use({ capability: { env: { PONG_DEPRECATED_NODES_BLOCK: 'false' } } });

const TRIGGER_NAME = 'Manual Trigger';
const FUNCTION_NODE_NAME = 'Function';

/**
 * Builds a saved workflow containing a manual trigger connected to a legacy
 * (deprecated) Function node, seeded via the API.
 */
function createDeprecatedFunctionWorkflow(): Partial<IWorkflowBase> {
	return {
		name: `Deprecated Function node ${nanoid()}`,
		nodes: [
			{
				id: nanoid(),
				name: TRIGGER_NAME,
				type: 'pong-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: nanoid(),
				name: FUNCTION_NODE_NAME,
				type: 'pong-nodes-base.function',
				typeVersion: 1,
				position: [300, 0],
				parameters: { functionCode: 'return items;' },
			},
		],
		connections: {
			[TRIGGER_NAME]: {
				main: [[{ node: FUNCTION_NODE_NAME, type: 'main', index: 0 }]],
			},
		},
		active: false,
	};
}

test.describe(
	'Deprecated nodes',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should freeze a saved deprecated node with a read-only NDV and deprecation notice', async ({
			api,
			pong,
		}) => {
			await pong.start.fromHome();

			const { workflowId } = await api.workflows.createWorkflowFromDefinition(
				createDeprecatedFunctionWorkflow(),
				{ makeUnique: false },
			);

			await pong.navigate.toWorkflow(workflowId);

			// Canvas: the frozen deprecated node shows the deprecated status indicator
			await expect(pong.canvas.getNodeDeprecatedStatusIndicator(FUNCTION_NODE_NAME)).toBeVisible();

			// NDV: opening the node surfaces the deprecation notice
			await pong.canvas.openNode(FUNCTION_NODE_NAME);
			await expect(pong.ndv.getDeprecatedNotice()).toBeVisible();

			// NDV is read-only: the code editor is not editable
			await expect(pong.ndv.getParameterEditor('functionCode')).toHaveAttribute(
				'aria-readonly',
				'true',
			);
		});

		test('should delete a saved deprecated node and save the workflow', async ({ api, pong }) => {
			await pong.start.fromHome();

			const { workflowId } = await api.workflows.createWorkflowFromDefinition(
				createDeprecatedFunctionWorkflow(),
				{ makeUnique: false },
			);

			await pong.navigate.toWorkflow(workflowId);

			// The timer also covers the hover-gated delete click, which can take
			// several seconds on a loaded CI runner before autosave starts.
			const saved = pong.canvas.waitForSaveWorkflowCompleted({ timeout: 10_000 });
			await pong.canvas.deleteNodeByName(FUNCTION_NODE_NAME);

			expect((await saved).ok()).toBe(true);
			await expect(pong.canvas.nodeByName(FUNCTION_NODE_NAME)).toHaveCount(0);
			await expect(pong.canvas.nodeByName(TRIGGER_NAME)).toBeVisible();
		});
	},
);
