import type { IRestApiContext } from '@pong/rest-api-client';
import { makeRestApiRequest } from '@pong/rest-api-client';
import type { QuickConnectOption } from '@pong/api-types';

type GetQuickConnectApiKeyResponse = {
	apiKey: string;
};

export async function getQuickConnectApiKey(
	context: IRestApiContext,
	{ quickConnectType }: { quickConnectType: QuickConnectOption['quickConnectType'] },
): Promise<GetQuickConnectApiKeyResponse> {
	return await makeRestApiRequest(context, 'POST', '/quick-connect', { quickConnectType });
}
