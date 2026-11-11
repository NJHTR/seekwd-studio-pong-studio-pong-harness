import { authenticator } from 'otplib';

import { INSTANCE_OWNER_CREDENTIALS } from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'two-factor-auth' } } });

const TEST_DATA = {
	NEW_EMAIL: 'newemail@test.com',
	NEW_FIRST_NAME: 'newFirstName',
	NEW_LAST_NAME: 'newLastName',
};

const NOTIFICATIONS = {
	PERSONAL_DETAILS_UPDATED: 'Personal details updated',
};

const { email, password, mfaSecret, mfaRecoveryCodes } = INSTANCE_OWNER_CREDENTIALS;
const RECOVERY_CODE = mfaRecoveryCodes![0];

test.describe(
	'Two-factor authentication @auth:none @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test('Should be able to login with MFA code', async ({ pong }) => {
			await pong.mfaComposer.enableMfa(email, password, mfaSecret!);
			await pong.sideBar.signOutFromWorkflows();

			await pong.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

			await expect(pong.page).toHaveURL(/workflows/);
		});

		test('Should be able to login with MFA recovery code', async ({ pong }) => {
			await pong.mfaComposer.enableMfa(email, password, mfaSecret!);
			await pong.sideBar.signOutFromWorkflows();

			await pong.mfaComposer.loginWithMfaRecoveryCode(email, password, RECOVERY_CODE);

			await expect(pong.page).toHaveURL(/workflows/);
		});

		test('Should be able to disable MFA in account with MFA code', async ({ pong }) => {
			await pong.mfaComposer.enableMfa(email, password, mfaSecret!);
			await pong.sideBar.signOutFromWorkflows();

			await pong.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

			const disableToken = authenticator.generate(mfaSecret!);
			await pong.settingsPersonal.triggerDisableMfa();
			await pong.settingsPersonal.fillMfaCodeAndConfirm(disableToken);

			await expect(pong.settingsPersonal.getEnableMfaButton()).toBeVisible();
		});

		test('Should prompt for MFA code when email changes', async ({ pong }) => {
			await pong.mfaComposer.enableMfa(email, password, mfaSecret!);

			await pong.settingsPersonal.goto();
			await pong.settingsPersonal.fillEmail(TEST_DATA.NEW_EMAIL);
			await pong.settingsPersonal.pressEnterOnEmail();

			const mfaCode = authenticator.generate(mfaSecret!);
			await pong.settingsPersonal.fillMfaCodeAndConfirm(mfaCode);

			await expect(
				pong.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
			).toBeVisible();
		});

		test('Should prompt for MFA recovery code when email changes', async ({ pong }) => {
			await pong.mfaComposer.enableMfa(email, password, mfaSecret!);

			await pong.settingsPersonal.goto();
			await pong.settingsPersonal.fillEmail(TEST_DATA.NEW_EMAIL);
			await pong.settingsPersonal.pressEnterOnEmail();

			await expect(pong.settingsPersonal.getMfaCodeOrRecoveryCodeInput()).toBeVisible();
		});

		test('Should not prompt for MFA code or recovery code when first name or last name changes', async ({
			pong,
		}) => {
			await pong.mfaComposer.enableMfa(email, password, mfaSecret!);

			await pong.settingsPersonal.goto();

			expect((await pong.settingsPersonal.saveFirstName(TEST_DATA.NEW_FIRST_NAME)).ok()).toBe(true);
			expect((await pong.settingsPersonal.saveLastName(TEST_DATA.NEW_LAST_NAME)).ok()).toBe(true);

			await pong.notifications.waitForNotification(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED);
			await expect(pong.settingsPersonal.getMfaCodeOrRecoveryCodeInput()).toBeHidden();
		});

		test('Should be able to disable MFA in account with recovery code', async ({ pong }) => {
			await pong.mfaComposer.enableMfa(email, password, mfaSecret!);
			await pong.sideBar.signOutFromWorkflows();

			await pong.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

			await pong.settingsPersonal.triggerDisableMfa();
			await pong.settingsPersonal.fillMfaCodeAndConfirm(RECOVERY_CODE);

			await expect(pong.settingsPersonal.getEnableMfaButton()).toBeVisible();
		});
	},
);
