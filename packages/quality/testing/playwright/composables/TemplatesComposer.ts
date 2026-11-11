import { expect } from '@playwright/test';

import type { pongPage } from '../pages/pongPage';

/**
 * A class for user interactions with templates that go across multiple pages.
 */
export class TemplatesComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Navigates to templates page, waits for loading to complete,
	 * selects the first available template, and imports it to a new workflow
	 * @returns Promise that resolves when the template has been imported
	 */
	async importFirstTemplate(): Promise<void> {
		await this.pong.navigate.toTemplates();
		await expect(this.pong.templates.getSkeletonLoader()).toBeHidden();
		await expect(this.pong.templates.getFirstTemplateCard()).toBeVisible();
		await expect(this.pong.templates.getTemplatesLoadingContainer()).toBeHidden();

		await this.pong.templates.clickFirstTemplateCard();
		await expect(this.pong.templates.getUseTemplateButton()).toBeVisible();

		await this.pong.templates.clickUseTemplateButton();
		// New workflows redirect to /workflow/<id>?new=true with optional templateId
		await expect(this.pong.page).toHaveURL(/\/workflow\/[a-zA-Z0-9_-]+\?.*new=true/);
	}

	/**
	 * Fill in dummy credentials for an app in the template credential setup flow
	 * Opens credential creation, fills name, saves, and closes modal
	 * @param appName - The name of the app (e.g. 'Shopify', 'X (Formerly Twitter)')
	 */
	async fillDummyCredentialForApp(
		appName: string,
		{ fields }: { fields: Record<string, string> } = { fields: {} },
	): Promise<void> {
		await this.pong.templateCredentialSetup.openCredentialCreation(appName);
		await this.pong.templateCredentialSetup.credentialModal.getCredentialName().click();
		await this.pong.templateCredentialSetup.credentialModal.getNameInput().fill('test');
		await this.pong.templateCredentialSetup.credentialModal.fillAllFields(fields);
		await this.pong.templateCredentialSetup.credentialModal.save();
		await this.pong.templateCredentialSetup.credentialModal.close();
	}

	/**
	 * Fill in dummy credentials for an OAuth app.
	 * OAuth credentials have no Save button — clicking Connect implicitly saves.
	 * @param appName - The name of the app (e.g. 'X (Formerly Twitter)')
	 */
	async fillDummyCredentialForOAuthApp(
		appName: string,
		{ fields }: { fields: Record<string, string> } = { fields: {} },
	): Promise<void> {
		await this.pong.templateCredentialSetup.openCredentialCreation(appName);
		await this.pong.templateCredentialSetup.credentialModal.getCredentialName().click();
		await this.pong.templateCredentialSetup.credentialModal.getNameInput().fill('test');
		await this.pong.templateCredentialSetup.credentialModal.fillAllFields(fields);

		await this.pong.templateCredentialSetup.credentialModal.oauthConnectButton.click();
		await this.pong.templateCredentialSetup.credentialModal.close();
		await this.pong.templateCredentialSetup.dismissMessageBox();
	}
}
