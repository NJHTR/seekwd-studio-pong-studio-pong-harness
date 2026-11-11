import type { Workflow } from '@/pong-api-client/pong-api-client.types';

import type { AuthenticatedPongApiClient } from './authenticated-pong-api-client';

export class WorkflowApiClient {
	constructor(private readonly apiClient: AuthenticatedPongApiClient) {}

	async getAllWorkflows(): Promise<Workflow[]> {
		const response = await this.apiClient.get<{ count: number; data: Workflow[] }>('/workflows');

		return response.data.data;
	}

	async createWorkflow(workflow: unknown): Promise<Workflow> {
		const response = await this.apiClient.post<{ data: Workflow }>('/workflows', workflow);

		return response.data.data;
	}

	async activateWorkflow(workflow: Workflow): Promise<Workflow> {
		const response = await this.apiClient.post<{ data: Workflow }>(
			`/workflows/${workflow.id}/activate`,
			{
				versionId: workflow.versionId,
			},
		);

		return response.data.data;
	}

	async archiveWorkflow(workflowId: Workflow['id']): Promise<void> {
		await this.apiClient.post(`/workflows/${workflowId}/archive`, {});
	}

	/**
	 * Deletes an archived workflow. pong removes the triggers of an unpublished
	 * workflow in the background and rejects the delete with 409 until it is done,
	 * so we retry until the timeout.
	 */
	async deleteWorkflow(workflowId: Workflow['id']): Promise<void> {
		const RETRY_INTERVAL_MS = 500;
		const TIMEOUT_MS = 30_000;
		const deadline = Date.now() + TIMEOUT_MS;

		while (true) {
			const response = await this.apiClient.delete<{ message?: string }>(
				`/workflows/${workflowId}`,
				{
					timeout: Math.max(deadline - Date.now(), 1),
					validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
				},
			);

			if (response.status !== 409) return;

			if (Date.now() >= deadline) {
				throw new Error(
					`Could not delete workflow ${workflowId} within ${TIMEOUT_MS / 1000} seconds: ${response.data.message}`,
				);
			}

			await this.apiClient.delay(RETRY_INTERVAL_MS);
		}
	}
}
