import { expect } from '@playwright/test';
import { authenticator } from 'otplib';

import type { pongPage } from '../pages/pongPage';

export class MfaComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Enable MFA for a user using predefined secret
	 * @param email - User email
	 * @param password - User password
	 * @param mfaSecret - Known MFA secret to use for token generation
	 */
	async enableMfa(email: string, password: string, mfaSecret: string): Promise<void> {
		await this.pong.signIn.loginWithEmailAndPassword(email, password, true);
		await this.pong.settingsPersonal.goto();

		await this.pong.settingsPersonal.clickEnableMfa();

		await this.pong.mfaSetupModal.container.waitFor({ state: 'visible' });

		await this.pong.mfaSetupModal.clickCopySecretToClipboard();

		const token = authenticator.generate(mfaSecret);
		await this.pong.mfaSetupModal.fillToken(token);
		await this.pong.mfaSetupModal.clickContinue();
		await expect(this.pong.mfaSetupModal.getDownloadRecoveryCodesButton()).toBeVisible();
		await this.pong.mfaSetupModal.clickDownloadRecoveryCodes();
		await this.pong.mfaSetupModal.clickSave();
		await this.pong.mfaSetupModal.waitForHidden();
	}

	/**
	 * Login with MFA code
	 * @param email - User email
	 * @param password - User password
	 * @param mfaSecret - Known MFA secret for token generation
	 */
	async loginWithMfaCode(email: string, password: string, mfaSecret: string): Promise<void> {
		await this.pong.signIn.fillEmail(email);
		await this.pong.signIn.fillPassword(password);
		await this.pong.signIn.clickSubmit();

		await expect(this.pong.mfaLogin.getForm()).toBeVisible();
		const loginMfaCode = authenticator.generate(mfaSecret);
		await this.pong.mfaLogin.submitMfaCode(loginMfaCode);
		await expect(this.pong.page).toHaveURL(/workflows/);
	}

	/**
	 * Login with MFA recovery code
	 * @param email - User email
	 * @param password - User password
	 * @param recoveryCode - Known recovery code
	 */
	async loginWithMfaRecoveryCode(
		email: string,
		password: string,
		recoveryCode: string,
	): Promise<void> {
		await this.pong.signIn.fillEmail(email);
		await this.pong.signIn.fillPassword(password);
		await this.pong.signIn.clickSubmit();

		await expect(this.pong.mfaLogin.getForm()).toBeVisible();
		await this.pong.mfaLogin.submitMfaRecoveryCode(recoveryCode);
		await expect(this.pong.page).toHaveURL(/workflows/);
	}
}
