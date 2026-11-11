import type { AuthenticatedPongApiClient } from './authenticated-pong-api-client';

export class ProjectApiClient {
	constructor(private readonly apiClient: AuthenticatedPongApiClient) {}

	async getPersonalProject(): Promise<string> {
		const response = await this.apiClient.get<{ data: { id: string } }>('/projects/personal');

		return response.data.data.id;
	}
}
