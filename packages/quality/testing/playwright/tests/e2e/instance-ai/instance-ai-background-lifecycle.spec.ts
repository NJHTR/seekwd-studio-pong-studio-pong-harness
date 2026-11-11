import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

const TERMINAL_FALLBACK_TEXT = 'I finished the run, but I did not generate a final response';
const BACKGROUND_CANCELLED_TEXT = 'The background workflow-builder task was cancelled.';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI background lifecycle',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'should recover when a background builder task is cancelled',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ api, pong }, testInfo) => {
				test.skip(
					testInfo.project.name.includes('multi-main'),
					'Background task simulation is not yet stable on the multi-main project',
				);

				const owner = await api.signin('owner');
				const simulation = await api.startInstanceAiBackgroundTimeoutSimulation(owner.id);

				await pong.instanceAi.gotoThread(simulation.threadId);
				await expect(pong.instanceAi.getAssistantMessages().first()).toContainText(
					'I started a background workflow-builder task.',
					{ timeout: 15_000 },
				);
				await expect(pong.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);

				let taskId = '';
				await expect
					.poll(
						async () => {
							const status = await api.getInstanceAiThreadStatus(simulation.threadId);
							const [task] = status.backgroundTasks;
							taskId = task?.taskId ?? '';

							return task?.status;
						},
						{ timeout: 15_000 },
					)
					.toBe('running');
				expect(taskId).not.toBe('');

				await api.cancelInstanceAiTask(simulation.threadId, taskId);

				await expect(pong.instanceAi.getAssistantMessageText(BACKGROUND_CANCELLED_TEXT)).toBeVisible(
					{
						timeout: 15_000,
					},
				);
				await expect(pong.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);
				await expect(pong.instanceAi.getBackgroundTaskIndicator()).toBeHidden();
				await expect(pong.instanceAi.getSendButton()).toBeVisible();

				await pong.page.reload();
				await expect(pong.instanceAi.getChatInput()).toBeVisible({ timeout: 30_000 });
				await expect(
					pong.instanceAi.getAssistantMessageText(BACKGROUND_CANCELLED_TEXT),
				).toBeVisible();
				await expect(pong.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);
				await expect(pong.instanceAi.getBackgroundTaskIndicator()).toBeHidden();
				await expect(pong.instanceAi.getSendButton()).toBeVisible();
			},
		);
	},
);
