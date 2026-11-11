import { proxyFetch } from '@pong/ai-utilities';
import { listOpenAiModels } from '@pong/ai-utilities/model-discovery';
import { AiConfig } from '@pong/config';
import { Container } from '@pong/di';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'pong-workflow';

import { mergeCustomHeaders } from '../../../../utils/helpers';
import { assertOpenAiCredentialAllowsUrl } from '../../../vendors/OpenAi/helpers/credentials';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('openAiApi');
	const baseUrlOverride = this.getNodeParameter('options.baseURL', '') as string;
	if (baseUrlOverride) {
		assertOpenAiCredentialAllowsUrl(this.getNode(), credentials, baseUrlOverride);
	}
	const baseURL = baseUrlOverride || (credentials.url as string) || 'https://api.openai.com/v1';
	const { openAiDefaultHeaders } = Container.get(AiConfig);
	const egressFilter = this.helpers.getSecureEgressFilter();
	const headers = mergeCustomHeaders(credentials, openAiDefaultHeaders ?? {});

	// Shared with the agents model catalog: endpoint, auth, chat-model filtering
	// (including include-all on custom hosts) live in @pong/ai-utilities/model-discovery.
	const models = await listOpenAiModels({
		apiKey: credentials.apiKey as string,
		baseURL,
		headers,
		fetch: async (input, init) => await proxyFetch({ input, init, egressFilter }),
	});

	return {
		results: models
			.filter((model) => !filter || model.id.toLowerCase().includes(filter.toLowerCase()))
			.map((model) => ({ name: model.id, value: model.id })),
	};
}
