import type { ChatOllamaInput } from '@langchain/ollama';
import { ChatOllama } from '@langchain/ollama';
import {
	makePongLlmFailedAttemptHandler,
	PongLlmTracing,
	proxyFetch,
	getConnectionHintNoticeField,
} from '@pong/ai-utilities';
import {
	assertCredentialAllowsUrl,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'pong-workflow';

import { wrapChatModelMessageInput } from '@utils/chatModelMessageWrapper';

import { ollamaModel, ollamaOptions, ollamaDescription } from '../LMOllama/description';

export class LmChatOllama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ollama Chat Model',

		name: 'lmChatOllama',
		icon: 'file:ollama.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Ollama',
		defaults: {
			name: 'Ollama Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
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
		const options = this.getNodeParameter('options', itemIndex, {}) as ChatOllamaInput;
		const headers = credentials.apiKey
			? {
					Authorization: `Bearer ${credentials.apiKey as string}`,
				}
			: undefined;

		const egressFilter = this.helpers.getSecureEgressFilter();
		const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) =>
			await proxyFetch({ input, init, egressFilter });

		const model = new ChatOllama({
			...options,
			baseUrl,
			model: modelName,
			format: options.format === 'default' ? undefined : options.format,
			callbacks: [new PongLlmTracing(this)],
			onFailedAttempt: makePongLlmFailedAttemptHandler(this),
			headers,
			fetch: fetchWithTimeout,
		});

		return {
			response: wrapChatModelMessageInput(model),
		};
	}
}
