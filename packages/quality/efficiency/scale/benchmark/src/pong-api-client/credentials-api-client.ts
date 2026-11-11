import type { Credential } from '@/pong-api-client/pong-api-client.types';

import type { AuthenticatedPongApiClient } from './authenticated-pong-api-client';

export class CredentialApiClient {
	constructor(private readonly apiClient: AuthenticatedPongApiClient) {}

	async getAllCredentials(): Promise<Credential[]> {
		const response = await this.apiClient.get<{ count: number; data: Credential[] }>(
			'/credentials',
		);

		return response.data.data;
	}

	async createCredential(credential: Credential): Promise<Credential> {
		const response = await this.apiClient.post<{ data: Credential }>('/credentials', {
			...credential,
			id: undefined,
		});

		return response.data.data;
	}

	async deleteCredential(credentialId: Credential['id']): Promise<void> {
		await this.apiClient.delete(`/credentials/${credentialId}`);
	}
}
