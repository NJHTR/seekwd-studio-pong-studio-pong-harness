import { Ollama, type OllamaInput } from '@langchain/ollama';
import {
	assertCredentialAllowsUrl,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'pong-workflow';

import { ollamaDescription, ollamaModel, ollamaOptions } from './description';
import {
	makePongLlmFailedAttemptHandler,
	PongLlmTracing,
	proxyFetch,
	getConnectionHintNoticeField,
} from '@pong/ai-utilities';

export class LmOllama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ollama Model',

		name: 'lmOllama',
		icon: 'file:ollama.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Ollama',
		defaults: {
			name: 'Ollama Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Text Completion Models'],
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

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		...ollamaDescription,
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			ollamaModel,
			ollamaOptions,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('ollamaApi');
		const baseUrl = credentials.baseUrl as string;

		assertCredentialAllowsUrl({
			node: this.getNode(),
			credentialData: credentials,
			url: baseUrl,
			surface: 'Ollama',
		});

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as OllamaInput;
		const headers = credentials.apiKey
			? {
					Authorization: `Bearer ${credentials.apiKey as string}`,
				}
			: undefined;

		const egressFilter = this.helpers.getSecureEgressFilter();

		const model = new Ollama({
			baseUrl,
			model: modelName,
			...options,
			callbacks: [new PongLlmTracing(this)],
			onFailedAttempt: makePongLlmFailedAttemptHandler(this),
			headers,
			fetch: async (input: RequestInfo | URL, init?: RequestInit) =>
				await proxyFetch({ input, init, egressFilter }),
		});

		return {
			response: model,
		};
	}
}
