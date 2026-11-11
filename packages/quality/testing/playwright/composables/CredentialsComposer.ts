import type { CreateCredentialDto } from '@pong/api-types';

import type { pongPage } from '../pages/pongPage';

export class CredentialsComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Create a credential through the Credentials list UI.
	 * Expects the visible label of the credential type (e.g. 'Notion API').
	 */
	async createFromList(
		credentialType: string,
		fields: Record<string, string>,
		options?: { name?: string; projectId?: string; closeDialog?: boolean },
	) {
		if (options?.projectId) {
			await this.pong.navigate.toCredentials(options.projectId);
		} else {
			await this.pong.navigate.toCredentials();
		}

		await this.pong.credentials.addResource.credential();
		await this.pong.credentials.createCredentialFromCredentialPicker(credentialType, fields, {
			name: options?.name,
			closeDialog: options?.closeDialog,
		});
	}

	/**
	 * Create a credential through the NDV flow.
	 * Type is implied by the open node's credential requirement.
	 */
	async createFromNdv(
		fields: Record<string, string>,
		options?: { name?: string; closeDialog?: boolean },
	) {
		await this.pong.ndv.clickCreateNewCredential();
		await this.pong.canvas.credentialModal.addCredential(fields, {
			name: options?.name,
			closeDialog: options?.closeDialog,
		});
	}

	/**
	 * Create a credential directly via API. Returns created credential object.
	 */
	async createFromApi(payload: CreateCredentialDto & { projectId?: string }) {
		return await this.pong.api.credentials.createCredential(payload);
	}
}
