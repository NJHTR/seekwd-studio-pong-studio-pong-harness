import { test, expect } from '../../../fixtures/base';
import basePlanData from '../../../fixtures/plan-data-trial.json';
import type { pongPage } from '../../../pages/pongPage';
import type { TestRequirements } from '../../../Types';

test.use({ capability: { env: { TEST_ISOLATION: 'cloud' } } });

const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
const planData = { ...basePlanData, expirationDate: fiveDaysFromNow.toJSON() };

const cloudTrialRequirements: TestRequirements = {
	config: {
		settings: {
			publicApi: {
				enabled: false,
				latestVersion: 1,
				path: 'api',
				swaggerUi: { enabled: false },
			},
			deployment: { type: 'cloud' },
			pongMetadata: { userId: '1' },

			aiCredits: {
				enabled: true,
				credits: 100,
				setup: true,
			},
			banners: {
				dismissed: ['V1'], // Prevent V1 banner interference
			},
		},
	},
	intercepts: {
		'cloud-plan': {
			url: '**/rest/admin/cloud-plan',
			response: planData,
		},
		'cloud-user': {
			url: '**/rest/cloud/proxy/user/me',
			response: {},
		},
	},
};

const setupCloudTest = async (
	pong: pongPage,
	setupRequirements: (requirements: TestRequirements) => Promise<void>,
	requirements: TestRequirements,
) => {
	await setupRequirements(requirements);
	await pong.page.waitForLoadState();
};

test.describe(
	'Cloud @db:reset @auth:owner',
	{
		annotation: [{ type: 'owner', description: 'Cloud Platform' }],
	},
	() => {
		test.describe('Trial Upgrade', () => {
			test('should render trial banner for opt-in cloud user', async ({
				pong,
				setupRequirements,
			}) => {
				await setupCloudTest(pong, setupRequirements, cloudTrialRequirements);
				await pong.start.fromBlankCanvas();
				await pong.sideBar.expand();

				await expect(pong.sideBar.getTrialBanner()).toBeVisible();
			});
		});

		test.describe('Admin Home', () => {
			test('should show admin button', async ({ pong, setupRequirements }) => {
				await setupCloudTest(pong, setupRequirements, cloudTrialRequirements);
				await pong.start.fromBlankCanvas();
				await pong.sideBar.expand();

				await expect(pong.sideBar.getAdminPanel()).toBeVisible();
			});
		});

		test.describe('Public API', () => {
			test('should show upgrade CTA for Public API if user is trialing', async ({
				pong,
				setupRequirements,
			}) => {
				await setupCloudTest(pong, setupRequirements, cloudTrialRequirements);
				await pong.navigate.toApiSettings();

				await pong.page.waitForLoadState();

				await expect(pong.settingsPersonal.getUpgradeCta()).toBeVisible();
			});
		});
	},
);
