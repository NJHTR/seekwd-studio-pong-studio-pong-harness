import type { AssistantThreadTabsResponse, AssistantThreadTabsState } from '@pong/api-types';
import { makeRestApiRequest } from '@pong/rest-api-client';
import type { IRestApiContext } from '@pong/rest-api-client';

export async function fetchAssistantAgentThreadTabs(
	context: IRestApiContext,
	threadId: string,
): Promise<AssistantThreadTabsResponse> {
	return await makeRestApiRequest(context, 'GET', `/assistant/threads/${threadId}/tabs`);
}

export async function fetchAssistantAgentThreadCredits(
	context: IRestApiContext,
	threadId: string,
): Promise<{ creditsUsed: number | null }> {
	return await makeRestApiRequest(context, 'GET', `/assistant/threads/${threadId}/credits`);
}

export async function saveAssistantAgentThreadTabs(
	context: IRestApiContext,
	threadId: string,
	state: AssistantThreadTabsState,
): Promise<AssistantThreadTabsResponse> {
	return await makeRestApiRequest(context, 'PUT', `/assistant/threads/${threadId}/tabs`, state);
}
