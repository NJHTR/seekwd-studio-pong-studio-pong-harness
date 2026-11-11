import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const NOW = Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const THREE_DAYS = ONE_DAY * 3;
const SEVEN_DAYS = ONE_DAY * 7;
const ABOUT_SIX_MONTHS = ONE_DAY * 30 * 6 + ONE_DAY;

const ACTIVATED_USER_SETTINGS = {
	userActivated: true,
	userActivatedAt: NOW - THREE_DAYS - 1000,
};

const getNpsTestRequirements: TestRequirements = {
	config: {
		settings: {
			telemetry: {
				enabled: true,
			},
		},
	},
	intercepts: {
		npsSurveyApi: {
			url: '**/rest/user-settings/nps-survey',
			response: { success: true },
		},
		telemetryTest: {
			url: '**/test/telemetry',
			response: { status: 'ok' },
		},
		telemetryProxy: {
			url: '**/rest/telemetry/proxy',
			response: { status: 'ok' },
		},
		telemetryRudderstack: {
			url: '**/rest/telemetry/rudderstack',
			response: { status: 'ok' },
		},
	},
};

test.fixme(
	'NPS Survey',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.page.route('**/rest/login', async (route) => {
				const response = await route.fetch();
				const originalJson = await response.json();

				const modifiedData = {
					...originalJson,
					data: {
						...originalJson.data,
						settings: {
							...originalJson.data?.settings,
							...ACTIVATED_USER_SETTINGS,
						},
					},
				};

				await route.fulfill({
					status: response.status(),
					headers: response.headers(),
					contentType: 'application/json',
					body: JSON.stringify(modifiedData),
				});
			});

			await pong.goHome();
		});

		test('shows nps survey to recently activated user and can submit feedback', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements(getNpsTestRequirements);
			await pong.canvas.visitWithTimestamp(NOW);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();

			await expect(pong.npsSurvey.container).toBeVisible();
			expect(await pong.npsSurvey.getRatingButtonCount()).toBe(11);

			await pong.npsSurvey.clickRating(0);
			await pong.npsSurvey.fillFeedback('pong is the best');
			await pong.npsSurvey.clickSubmitButton();

			await pong.canvas.visitWithTimestamp(NOW + ONE_DAY);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + ABOUT_SIX_MONTHS);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await expect(pong.npsSurvey.container).toBeVisible();
		});

		test('allows user to ignore survey 3 times before stopping to show until 6 months later', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements(getNpsTestRequirements);
			await pong.canvas.visitWithTimestamp(NOW);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await pong.notifications.quickCloseAll();

			await expect(pong.npsSurvey.container).toBeVisible();
			await pong.npsSurvey.closeSurvey();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + ONE_DAY);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + SEVEN_DAYS + 10000);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await pong.notifications.quickCloseAll();

			await expect(pong.npsSurvey.container).toBeVisible();
			await pong.npsSurvey.closeSurvey();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + SEVEN_DAYS + 10000);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + (SEVEN_DAYS + 10000) * 2 + ONE_DAY);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await pong.notifications.quickCloseAll();

			await expect(pong.npsSurvey.container).toBeVisible();
			await pong.npsSurvey.closeSurvey();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + (SEVEN_DAYS + 10000) * 2 + ONE_DAY * 2);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + (SEVEN_DAYS + 10000) * 3 + ONE_DAY * 3);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await expect(pong.npsSurvey.container).toBeHidden();

			await pong.canvas.visitWithTimestamp(NOW + (SEVEN_DAYS + 10000) * 3 + ABOUT_SIX_MONTHS);
			// Add a node to trigger autosave (required for NPS survey to show)
			await pong.canvas.addNode('Manual Trigger');
			await pong.page.keyboard.press('Escape');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await expect(pong.npsSurvey.container).toBeVisible();
		});
	},
);
