import { UUID_V7_PATTERN } from '@pong/constants';
import { nanoid } from 'nanoid';
import type { INode } from 'pong-workflow';

import { test, expect } from '../../../../../fixtures/base';

const TRIGGER_NAME = 'Manual Trigger';
const SET_NAME = 'Edit Fields';

const nodes: INode[] = [
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
		name: SET_NAME,
		type: 'pong-nodes-base.set',
		typeVersion: 3.4,
		position: [200, 0],
		parameters: {},
	},
];

test.describe(
	'Engine type setting',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			// The Engine Type select shows only when the instance runs engine v2.
			const activeModules = await pong.api.getActiveModules();
			test.skip(!activeModules.includes('engine-v2'), 'instance does not run engine v2');
		});

		test('runs the next manual execution on the engine the settings saved @engine:v2', async ({
			pong,
			canvasRuns,
		}) => {
			// The v1 step runs the legacy engine on purpose.
			canvasRuns.allowLegacyRuns();

			const { id: workflowId } = await pong.api.workflows.createWorkflow({
				name: `Engine type ${nanoid()}`,
				nodes,
				connections: {
					[TRIGGER_NAME]: { main: [[{ node: SET_NAME, type: 'main', index: 0 }]] },
				},
				pinData: {},
			});
			await pong.start.fromExistingWorkflow(workflowId);

			// v1 first: on the engine stack the API helper creates every workflow on v2,
			// so only the v2 step that follows proves the dialog's save.
			for (const { label, executionId } of [
				{ label: 'v1', executionId: /^\d+$/ },
				{ label: 'v2 (Beta)', executionId: UUID_V7_PATTERN },
			]) {
				await pong.workflowSettingsModal.open();
				await pong.workflowSettingsModal.selectEngineType(label);
				await pong.workflowSettingsModal.clickSave();
				await expect(pong.workflowSettingsModal.getModal()).toBeHidden();

				const runResponse = pong.page.waitForResponse(
					(response) =>
						response.request().method() === 'POST' &&
						response.url().endsWith(`/rest/workflows/${workflowId}/run`),
				);
				await pong.canvas.clickExecuteWorkflowButton();

				const { data } = await (await runResponse).json();
				expect(data.executionId, `the run after selecting ${label}`).toMatch(executionId);
			}
		});
	},
);
