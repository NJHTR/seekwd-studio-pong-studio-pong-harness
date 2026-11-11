import { nanoid } from 'nanoid';

import type { TestRequirements } from '../../../Types';
import { expect, instanceAiTestConfig, test } from './fixtures';

const mentionsTestConfig = {
	...instanceAiTestConfig,
	capability: {
		...instanceAiTestConfig.capability,
		env: {
			...instanceAiTestConfig.capability.env,
			PONG_FEATURE_FLAG_OVERRIDES: JSON.stringify({
				'116_at_mentions_enabled': true,
				'104_canvas_aia_node_context': false,
			}),
		},
	},
} as const;

const requirements: TestRequirements = {
	storage: {
		PONG_EXPERIMENT_OVERRIDES: JSON.stringify({ '116_at_mentions_enabled': true }),
	},
};

test.use(mentionsTestConfig);

test.describe(
	'Instance AI mentions',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'stages workflow context before the first message and restores it after reload',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-persist-messages-after-page-reload',
					},
				],
			},
			async ({ pong, api, setupRequirements, a11y }) => {
				await setupRequirements(requirements);
				const project = await api.projects.getMyPersonalProject();
				const workflow = await api.workflows.createWorkflow(
					{
						name: `Mentioned workflow ${nanoid()}`,
						nodes: [
							{
								id: 'if-node',
								name: 'If',
								type: 'pong-nodes-base.if',
								typeVersion: 2.2,
								position: [0, 0],
								parameters: {},
							},
						],
						connections: {},
					},
					project.id,
				);

				await pong.start.fromInstanceAi();
				await expect(pong.instanceAi.getMentionButton()).toBeEnabled();
				const input = pong.instanceAi.getChatInput();
				await input.fill('@');
				await input.pressSequentially(workflow.name);
				await expect(pong.instanceAi.getMentionMenu()).toBeVisible();
				await expect(pong.instanceAi.getMentionMenuItem(workflow.name)).toBeVisible();
				await expect(input).toBeFocused();
				const composerBounds = await pong.instanceAi.getComposer().boundingBox();
				const menuBounds = await pong.instanceAi.getMentionMenu().boundingBox();
				expect(composerBounds).not.toBeNull();
				expect(menuBounds).not.toBeNull();
				expect(Math.abs((composerBounds?.width ?? 0) - (menuBounds?.width ?? 0))).toBeLessThan(1);

				const violations = await a11y.check('instance-ai');
				expect(a11y.scans.at(-1)?.bucket).toBe('instance-ai');
				expect(violations).toEqual([]);

				await pong.instanceAi.selectMentionWithKeyboard(workflow.name);
				await expect(input).toHaveValue('');
				await expect(pong.instanceAi.getComposerWorkflowChip(workflow.name)).toBeVisible();
				expect(pong.instanceAi.getCurrentPath()).toBe('/assistant');
				await expect(pong.instanceAi.getPreviewTabByName(workflow.name)).toBeHidden();

				await input.fill('Remember this persistence message');
				await input.press('Enter');
				await pong.instanceAi.waitForResponseComplete(120_000);
				const threadId = pong.instanceAi.getCurrentThreadId();
				const userMessage = pong.instanceAi.getUserMessageByText(
					'Remember this persistence message',
				);
				await expect(
					pong.instanceAi.getWorkflowChipInMessage(userMessage, workflow.name),
				).toBeVisible();
				await expect(pong.instanceAi.getPreviewTabByName(workflow.name)).toBeVisible();

				await pong.instanceAi.reloadThread();
				expect(pong.instanceAi.getCurrentThreadId()).toBe(threadId);
				await expect(
					pong.instanceAi.getWorkflowChipInMessage(userMessage, workflow.name),
				).toBeVisible();
				await expect(pong.instanceAi.getPreviewTabByName(workflow.name)).toBeVisible();

				await input.fill('@');
				await input.pressSequentially('if');
				await expect(pong.instanceAi.getMentionMenuItem('If')).toBeVisible();
			},
		);

		test(
			'opens the mentioned workflow tab with the sent message and keeps child context after parent removal and reload',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-display-user-and-assistant-messages-in-timeline',
					},
				],
			},
			async ({ pong, api, setupRequirements }) => {
				await setupRequirements(requirements);
				const project = await api.projects.getMyPersonalProject();
				const imported = await api.workflows.importWorkflowFromFile(
					'Canvas-node-groups-persisted-fixture.json',
					{ projectId: project.id },
				);
				const workflowName = imported.createdWorkflow.name;
				const thread = await api.createInstanceAiThread(project.id);

				await pong.start.fromInstanceAiThread(thread.id);
				const input = pong.instanceAi.getChatInput();

				// A pick only stages the workflow as a draft. Its tab opens with the message that sends it.
				await input.fill('@');
				await input.pressSequentially(workflowName);
				await pong.instanceAi.selectMentionWithKeyboard(workflowName);
				await expect(pong.instanceAi.getComposerWorkflowChip(workflowName)).toBeVisible();
				await expect(pong.instanceAi.getPreviewTabByName(workflowName)).toBeHidden();

				await input.fill('Say hello back to me');
				await input.press('Enter');
				await pong.instanceAi.waitForResponseComplete(120_000);
				await expect(pong.instanceAi.getPreviewTabByName(workflowName)).toBeVisible();

				// The workflow is a tab of the thread now, so its groups and nodes are mentionable.
				await input.fill('@');
				await pong.instanceAi.selectMentionWithKeyboard(workflowName);
				await input.fill('@');
				await pong.instanceAi.highlightMentionWithKeyboard(workflowName);
				await pong.instanceAi.openHighlightedMentionSubmenu();
				await pong.instanceAi.selectMentionWithKeyboard('Persisted group');
				await input.fill('@');
				await pong.instanceAi.highlightMentionWithKeyboard(workflowName);
				await pong.instanceAi.openHighlightedMentionSubmenu();
				await pong.instanceAi.highlightMentionWithKeyboard('Persisted group');
				await pong.instanceAi.openHighlightedMentionSubmenu();
				await pong.instanceAi.selectMentionWithKeyboard('Set A');

				await expect(pong.instanceAi.getComposerWorkflowChip(workflowName)).toBeVisible();
				await expect(pong.instanceAi.getComposerGroupChip('Persisted group')).toBeVisible();
				await expect(pong.instanceAi.getComposerNodeChip('Set A')).toBeVisible();

				// Removing a mention changes the draft only: the child context and the tab stay.
				const removeWorkflow = pong.instanceAi.getComposerWorkflowRemoveButton(workflowName);
				await removeWorkflow.focus();
				await removeWorkflow.press('Space');
				await expect(pong.instanceAi.getComposerWorkflowChip(workflowName)).toBeHidden();
				await expect(pong.instanceAi.getComposerGroupChip('Persisted group')).toBeVisible();
				await expect(pong.instanceAi.getComposerNodeChip('Set A')).toBeVisible();
				await expect(pong.instanceAi.getPreviewTabByName(workflowName)).toBeVisible();

				// The same text keeps the replayed LLM recording valid for this second turn.
				await input.fill('Say hello back to me');
				await input.press('Enter');
				await pong.instanceAi.waitForResponseComplete(120_000);
				await pong.instanceAi.reloadThread();

				const userMessage = pong.instanceAi.getUserMessageByText('Say hello back to me').last();
				await expect(
					pong.instanceAi.getNodeChipInMessage(userMessage, 'Persisted group'),
				).toBeVisible();
				await expect(pong.instanceAi.getNodeChipInMessage(userMessage, 'Set A')).toBeVisible();
				await expect(pong.instanceAi.getPreviewTabByName(workflowName)).toBeVisible();
			},
		);
	},
);
