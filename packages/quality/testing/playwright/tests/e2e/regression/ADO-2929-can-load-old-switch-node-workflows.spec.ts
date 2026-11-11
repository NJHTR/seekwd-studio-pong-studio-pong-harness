import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	workflow: {
		'Switch_node_with_null_connection.json': 'Switch Node with Null Connection',
	},
};

test.describe(
	'ADO-2929 can load Switch nodes',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('can load workflows with Switch nodes with null at connection index @auth:owner', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await pong.canvas.deleteNodeByName('Switch');
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});
	},
);
