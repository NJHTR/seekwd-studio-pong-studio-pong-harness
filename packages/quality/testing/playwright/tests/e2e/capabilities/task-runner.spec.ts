import { CODE_NODE_NAME, MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

/**
 * Task Runner Tests
 *
 * Task runner is always enabled in all container stacks.
 * These tests verify code execution functionality.
 */
test.describe(
	'Task Runner',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should execute Javascript with task runner enabled', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test('should execute Python with task runner enabled', async ({ pong, pongContainer }) => {
			// Python needs the runner process, which only the container stacks start.
			test.skip(!pongContainer, 'container-only: requires a running task runner');

			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(CODE_NODE_NAME, {
				action: 'Code in Python',
				closeNDV: true,
			});
			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);
		});
	},
);
