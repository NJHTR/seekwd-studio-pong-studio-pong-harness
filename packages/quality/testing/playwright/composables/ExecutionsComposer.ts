import type { pongPage } from '../pages/pongPage';

/**
 * A class for user interactions with workflow executions that go across multiple pages.
 */
export class ExecutionsComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Creates workflow executions by executing the workflow multiple times.
	 * Waits for each execution to complete (by waiting for the POST /rest/workflows/:id/run response)
	 * before starting the next one.
	 *
	 * @param count - Number of executions to create
	 * @example
	 * // Create 10 executions
	 * await pong.executionsComposer.createExecutions(10);
	 */
	async createExecutions(count: number): Promise<void> {
		for (let i = 0; i < count; i++) {
			const responsePromise = this.pong.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/workflows/') &&
					response.url().includes('/run') &&
					response.request().method() === 'POST',
			);

			await this.pong.canvas.clickExecuteWorkflowButton();
			await responsePromise;
		}
	}

	/**
	 * Execute a specific node and capture the workflow run request payload.
	 * Sets up request interception before executing the node, then returns the parsed request body.
	 * Useful for testing the payload structure sent to the workflow run API.
	 *
	 * @param nodeName - The name of the node to execute
	 * @returns The parsed request body from the workflow run API call
	 * @example
	 * // Execute a node and verify payload structure
	 * const payload = await pong.executionsComposer.executeNodeAndCapturePayload('Process The Data');
	 * expect(payload).toHaveProperty('runData');
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async executeNodeAndCapturePayload(nodeName: string): Promise<any> {
		const workflowRunPromise = this.pong.page.waitForRequest(
			(request) =>
				request.url().includes('/rest/workflows/') &&
				request.url().includes('/run') &&
				request.method() === 'POST',
		);

		await this.pong.canvas.executeNode(nodeName);

		const workflowRunRequest = await workflowRunPromise;
		return workflowRunRequest.postDataJSON();
	}
}
