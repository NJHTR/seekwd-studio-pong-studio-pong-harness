import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Error workflow tooltip',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test('should display the unpublished warning above the open workflow list', async ({ pong }) => {
			const errorWorkflowName = `Unpublished error handler ${nanoid()}`;
			await pong.api.workflows.createWorkflow({
				name: errorWorkflowName,
				active: false,
				nodes: [
					{
						id: nanoid(),
						name: 'Error Trigger',
						type: 'pong-nodes-base.errorTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			const workflow = await pong.api.workflows.createWorkflow({
				name: `Production workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Schedule Trigger',
						type: 'pong-nodes-base.scheduleTrigger',
						typeVersion: 1.2,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			await pong.api.workflows.activate(workflow.id, workflow.versionId);
			await pong.start.fromExistingWorkflow(workflow.id);
			await pong.workflowSettingsModal.open();
			await pong.workflowSettingsModal.getErrorWorkflowField().click();
			await pong.workflowSettingsModal.getErrorWorkflowWarning(errorWorkflowName).hover();

			const tooltip = pong.workflowSettingsModal.getTooltip();
			await expect(tooltip).toHaveText(
				'Not published. Can be used for manual testing, but must be published before running in production.',
			);
			const list = pong.workflowSettingsModal.getErrorWorkflowList();
			await expect(list).toBeVisible();

			// DS-720: A tooltip can be visible in the DOM while the select list covers its text.
			await expect
				.poll(async () => {
					const tooltipBounds = await tooltip.boundingBox();
					const listBounds = await list.boundingBox();
					if (!tooltipBounds || !listBounds) return 'Tooltip or list has no bounds';

					const left = Math.max(tooltipBounds.x, listBounds.x);
					const right = Math.min(
						tooltipBounds.x + tooltipBounds.width,
						listBounds.x + listBounds.width,
					);
					const top = Math.max(tooltipBounds.y, listBounds.y);
					const bottom = Math.min(
						tooltipBounds.y + tooltipBounds.height,
						listBounds.y + listBounds.height,
					);
					if (right <= left || bottom <= top) return 'Tooltip and list do not overlap';

					return await tooltip.evaluate(
						(element, point) => {
							const topElement = document.elementFromPoint(point.x, point.y);
							if (element.contains(topElement)) return 'Tooltip';
							if (topElement?.closest('[role="listbox"]')) return 'Select list';
							return topElement?.tagName ?? 'No element at overlap';
						},
						{ x: (left + right) / 2, y: (top + bottom) / 2 },
					);
				}, 'The warning tooltip must be in front of the select list where they overlap')
				.toBe('Tooltip');
		});
	},
);
