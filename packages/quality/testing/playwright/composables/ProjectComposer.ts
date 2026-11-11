import { nanoid } from 'nanoid';

import type { pongPage } from '../pages/pongPage';

export class ProjectComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Create a project and return the project name and ID. If no project name is provided, a unique name will be generated.
	 * @param projectName - The name of the project to create.
	 * @returns The project name and ID.
	 */
	async createProject(projectName?: string) {
		await this.pong.sideBar.universalAdd();
		await this.pong.sideBar.getProjectButtonInUniversalAdd().click();
		// Creation POSTs the project and routes to its settings page before the toast
		// fires, so this is slower than a plain save.
		await this.pong.notifications.waitForNotificationAndClose('saved successfully', {
			timeout: 15000,
		});
		await this.pong.page.waitForLoadState();
		const projectNameUnique = projectName ?? `Project ${nanoid(8)}`;
		await this.pong.projectSettings.fillProjectName(projectNameUnique);
		await this.pong.projectSettings.clickSaveButton();
		const projectId = this.extractProjectIdFromPage('projects', 'settings');
		return { projectName: projectNameUnique, projectId };
	}

	/**
	 * Add a new credential to a project.
	 * @param projectName - The name of the project to add the credential to.
	 * @param credentialType - The type of credential to add by visible name e.g 'Notion API'
	 * @param credentialFieldName - The name of the field to add the credential to. e.g. 'apiKey' which would be data-test-id='parameter-input-apiKey'
	 * @param credentialValue - The value of the credential to add.
	 */
	async addCredentialToProject(
		projectName: string,
		credentialType: string,
		credentialFieldName: string,
		credentialValue: string,
	) {
		await this.pong.sideBar.openNewCredentialDialogForProject(projectName);
		await this.pong.credentials.createCredentialFromCredentialPicker(credentialType, {
			[credentialFieldName]: credentialValue,
		});
	}

	extractIdFromUrl(url: string, beforeWord: string, afterWord: string): string {
		const path = url.includes('://') ? new URL(url).pathname : url;
		const match = path.match(new RegExp(`/${beforeWord}/([^/]+)/${afterWord}`));
		return match?.[1] ?? '';
	}

	extractProjectIdFromPage(beforeWord: string, afterWord: string): string {
		return this.extractIdFromUrl(this.pong.navigate.currentUrl(), beforeWord, afterWord);
	}
}
