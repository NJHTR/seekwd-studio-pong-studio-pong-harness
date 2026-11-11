import { nanoid } from 'nanoid';
import { randomUUID } from 'crypto';

import { test, expect } from '../../../fixtures/base';

test.use({
	viewport: { width: 1536, height: 1100 },
	capability: {
		env: {
			TEST_ISOLATION: 'instance-ai-agent-preview-layout',
			PONG_ENABLED_MODULES: 'agents,instance-ai',
			PONG_INSTANCE_AI_MODEL_API_KEY: 'test-model-key',
			PONG_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			PONG_INSTANCE_AI_BROWSER_USE_ENABLED: 'false',
		},
	},
});

test.describe(
	'Assistant agent test chat layout',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('fills the Assistant column at different widths with a saved full-width layout', async ({
			pong,
			api,
			setupRequirements,
		}) => {
			await api.updateInstanceAiSettings({ enabled: true, searchDisabled: true });
			await setupRequirements({
				config: { moduleSettings: { 'instance-ai': { enabled: true, setupCompleted: true } } },
				storage: { PONG_AGENT_PREVIEW_LAYOUT: 'fullpage' },
			});
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: `Preview account ${nanoid(6)}`,
				type: 'anthropicApi',
				data: { apiKey: 'test-agent-key' },
			});
			const name = `Preview layout ${nanoid(6)}`;
			const { id: agentId } = await api.agents.create(project.id, {
				name,
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Reply briefly.',
			});
			const threadId = randomUUID();
			await api.instanceAi.createAgentArtifactThread({
				threadId,
				projectId: project.id,
				agentId,
				name,
			});
			await pong.start.fromHome();
			await pong.instanceAi.gotoThread(threadId);
			await pong.instanceAi.getAgentTestButton().click();
			await expect
				.poll(async () => await pong.instanceAi.getAgentTestChatBoundsDifference())
				.toBeLessThan(2);

			for (const width of [1280, 960, 375]) {
				await pong.page.setViewportSize({ width, height: 667 });
				await pong.page.emulateMedia({ colorScheme: 'dark' });
				await expect
					.poll(async () => await pong.instanceAi.getAgentTestChatBoundsDifference())
					.toBeLessThan(2);
			}
			await pong.page.emulateMedia({ reducedMotion: 'reduce' });
			await expect(pong.instanceAi.getAgentTestChatInner()).toHaveCSS('will-change', 'auto');
			await expect(pong.instanceAi.getAgentTestChatInner()).toHaveCSS('transition-duration', '0s');
		});
	},
);
