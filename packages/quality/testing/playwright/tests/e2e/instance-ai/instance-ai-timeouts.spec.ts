import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI timeouts',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test.fixme(
			'should show a timeout message when a stuck background task times out',
			async ({ api, pong }) => {
				const owner = await api.signin('owner');
				const simulation = await api.startInstanceAiBackgroundTimeoutSimulation(owner.id);

				await pong.instanceAi.gotoThread(simulation.threadId);
				await expect(pong.instanceAi.getAssistantMessages().first()).toContainText(
					'I started a background workflow-builder task.',
					{ timeout: 15_000 },
				);
				await expect(pong.instanceAi.getBackgroundTaskIndicator()).toBeVisible({ timeout: 15_000 });

				await api.runInstanceAiLivenessSweep(simulation.timeoutAt);

				await expect(
					pong.instanceAi.getAssistantMessageText(
						/Background workflow-builder task timed out after \d+ms/,
					),
				).toBeVisible({ timeout: 15_000 });
				await expect(pong.instanceAi.getBackgroundTaskIndicator()).toBeHidden({ timeout: 15_000 });
			},
		);
	},
);
