import fs from 'fs';

import { CODE_NODE_NAME, SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';

test.describe(
	'Workflow Copy Paste',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.fixme();

		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should copy nodes', async ({ pong }) => {
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);

			await expect(pong.canvas.nodeCreator.getRoot()).not.toBeAttached();

			await pong.clipboard.grant();

			await pong.canvas.selectAll();
			await pong.canvas.copyNodes();

			await pong.notifications.waitForNotificationAndClose('Copied to clipboard');
			const clipboardText = await pong.clipboard.readText();
			const copiedWorkflow = JSON.parse(clipboardText);

			expect(copiedWorkflow.nodes).toHaveLength(2);
		});

		test('should paste nodes (both current and old node versions)', async ({ pong }) => {
			const workflowJson = fs.readFileSync(
				resolveFromRoot('workflows', 'Test_workflow-actions_paste-data.json'),
				'utf-8',
			);

			await pong.canvas.canvasPane().click();
			await pong.clipboard.paste(workflowJson);
			await pong.canvas.clickZoomToFitButton();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(5);
			await expect(pong.canvas.nodeConnections()).toHaveCount(5);
		});

		test('should allow importing nodes without names', async ({ pong }) => {
			const workflowJson = fs.readFileSync(
				resolveFromRoot('workflows', 'Test_workflow-actions_import_nodes_empty_name.json'),
				'utf-8',
			);

			await pong.canvas.canvasPane().click();
			await pong.clipboard.paste(workflowJson);
			await pong.canvas.clickZoomToFitButton();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.nodeConnections()).toHaveCount(2);

			const nodes = pong.canvas.getCanvasNodes();
			const count = await nodes.count();
			for (let i = 0; i < count; i++) {
				await expect(nodes.nth(i)).toHaveAttribute('data-node-name');
			}
		});
	},
);
