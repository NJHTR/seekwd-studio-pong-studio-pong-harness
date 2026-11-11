import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			PONG_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-preview-layout',
		},
	},
});

test.describe(
	'Agent preview layout',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test('fills the builder when full width is selected', async ({ pong, api }) => {
			const project = await api.projects.getMyPersonalProject();
			const { id: agentId } = await api.agents.create(project.id, `Preview layout ${nanoid(6)}`);

			await pong.start.fromHome();
			await pong.agentBuilder.goto(project.id, agentId, { openPreview: true });

			const builder = pong.agentBuilder.getBuilderContainer();
			const dock = pong.agentBuilder.getPreviewDock();
			await expect(builder).toBeVisible();
			await expect(dock).toBeVisible();
			await expect(dock).toHaveAttribute('data-preview-layout', 'docked');

			expect(await pong.agentBuilder.getPreviewWidthDifference()).toBeGreaterThan(10);

			await pong.agentBuilder.getPreviewMoreButton().click();
			await pong.agentBuilder.getFullWidthMenuItem().click();
			await expect(dock).toHaveAttribute('data-preview-layout', 'fullpage');

			await expect
				.poll(async () => await pong.agentBuilder.getPreviewWidthDifference())
				.toBeLessThan(2);

			await pong.page.setViewportSize({ width: 375, height: 667 });
			await pong.page.emulateMedia({ colorScheme: 'dark' });
			await expect
				.poll(async () => await pong.agentBuilder.getPreviewWidthDifference())
				.toBeLessThan(2);
		});
	},
);
