import { nanoid } from 'nanoid';

import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	storage: {
		PONG_EXPERIMENT_OVERRIDES: JSON.stringify({ '108_open_workflow_in_assistant': 'variant' }),
	},
};

test.use(instanceAiTestConfig);

test.describe(
	'Open workflows in assistant by default',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'treatment user opens a workflow card into the pong Assistant',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ pong, api, setupRequirements }) => {
				await setupRequirements(requirements);
				const workflow = await api.workflows.createWorkflow({
					name: `Open by default ${nanoid()}`,
					nodes: [],
					connections: {},
				});

				await pong.navigate.toWorkflows();
				await pong.workflows.cards.getWorkflow(workflow.name).click();

				await expect(pong.page).toHaveURL(/\/assistant\/[0-9a-f-]+$/, { timeout: 15_000 });
			},
		);

		test(
			'workflow deep-link creates a thread and redirects to it',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ pong, api }) => {
				const workflow = await api.workflows.createWorkflow({
					name: `Open by default ${nanoid()}`,
					nodes: [],
					connections: {},
				});
				await pong.navigate.toInstanceAi();

				await pong.page.goto(`/assistant/new?workflowId=${workflow.id}`);

				// The guard fetches the workflow, provisions a thread, and redirects
				// with no query — back-button safe, same as the template deep-link.
				await expect(pong.page).toHaveURL(/\/assistant\/[0-9a-f-]+$/, { timeout: 15_000 });
			},
		);

		test(
			'malformed workflow id lands on the assistant empty view',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ pong }) => {
				await pong.navigate.toInstanceAi();

				await pong.page.goto('/assistant/new?workflowId=%25%25');

				await expect(pong.page).toHaveURL(/\/assistant$/, { timeout: 15_000 });
				await expect(pong.instanceAi.getChatInput()).toBeVisible();
			},
		);
	},
);
