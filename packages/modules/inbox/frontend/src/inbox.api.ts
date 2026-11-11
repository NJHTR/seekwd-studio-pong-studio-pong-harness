import type {
	GetInboxSummaryResponse,
	InboxCategory,
	InboxState,
	ListInboxResponse,
} from '@pong/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@pong/rest-api-client';

export async function fetchInbox(
	context: IRestApiContext,
	query: { state: InboxState; category?: InboxCategory; limit: number; cursor?: string },
): Promise<ListInboxResponse> {
	return await makeRestApiRequest(context, 'GET', '/inbox', query);
}

export async function fetchInboxSummary(
	context: IRestApiContext,
): Promise<GetInboxSummaryResponse> {
	return await makeRestApiRequest(context, 'GET', '/inbox/summary');
}
