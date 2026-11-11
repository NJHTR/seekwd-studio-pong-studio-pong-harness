import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		services: ['sandbox'],
		env: {
			TEST_ISOLATION: 'instance-ai-onboarding',
			PONG_ENABLED_MODULES: 'instance-ai',
			PONG_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			PONG_INSTANCE_AI_MODEL_API_KEY: 'test-model-key',
			PONG_INSTANCE_AI_SANDBOX_ENABLED: 'true',
		},
	},
});

test.describe(
	'pong Assistant self-hosted onboarding @db:reset',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test('should verify search and complete onboarding', async ({ pong }) => {
			await pong.instanceAi.gotoOnboarding();
			await pong.instanceAi.mockSearchVerification({ ok: true, resultCount: 10 });

			await pong.instanceAi.getSetupButton().click();
			await pong.instanceAi.getSearchProvider('brave').click();
			await pong.instanceAi.getSearchValueInput().fill('test-search-key');
			await pong.instanceAi.getWizardPrimaryButton().click();

			await expect(pong.instanceAi.getOnboardingDoneHeading()).toBeVisible();
			await pong.instanceAi.getWizardPrimaryButton().click();
			await expect(pong.instanceAi.getChatInput()).toBeVisible();
		});

		test('should keep the search step open when verification fails', async ({ pong }) => {
			await pong.instanceAi.gotoOnboarding();
			await pong.instanceAi.mockSearchVerification({ ok: false, failure: 'unauthorized' });

			await pong.instanceAi.getSetupButton().click();
			await pong.instanceAi.getSearchProvider('brave').click();
			await pong.instanceAi.getSearchValueInput().fill('invalid-search-key');
			await pong.instanceAi.getWizardPrimaryButton().click();

			await expect(pong.instanceAi.getVerificationError()).toContainText(
				'The provider rejected the credential',
			);
			await expect(pong.instanceAi.getSearchProvider('brave')).toBeVisible();
		});
	},
);
