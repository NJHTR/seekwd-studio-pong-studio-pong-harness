import { OllamaEmbeddings } from '@langchain/ollama';
import {
	assertCredentialAllowsUrl,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'pong-workflow';

import { logWrapper, getConnectionHintNoticeField, proxyFetch } from '@pong/ai-utilities';

import { ollamaDescription, ollamaModel } from '../../llms/LMOllama/description';

export class EmbeddingsOllama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Ollama',
		name: 'embeddingsOllama',
		icon: 'file:ollama.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Ollama Embeddings',
		defaults: {
			name: 'Embeddings Ollama',
		},
		...ollamaDescription,
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]), ollamaModel],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings Ollama');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const credentials = await this.getCredentials('ollamaApi');
		const baseUrl = credentials.baseUrl as string;

		assertCredentialAllowsUrl({
			node: this.getNode(),
			credentialData: credentials,
			url: baseUrl,
			surface: 'Ollama',
		});

		const headers = credentials.apiKey
			? {
					Authorization: `Bearer ${credentials.apiKey as string}`,
				}
			: undefined;

		const egressFilter = this.helpers.getSecureEgressFilter();

		const embeddings = new OllamaEmbeddings({
			baseUrl,
			model: modelName,
			headers,
			fetch: async (input: RequestInfo | URL, init?: RequestInit) =>
				await proxyFetch({ input, init, egressFilter }),
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
