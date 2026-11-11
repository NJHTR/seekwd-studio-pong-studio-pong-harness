import type { TextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'pong-workflow';

import {
	logWrapper,
	PongJsonLoader,
	getConnectionHintNoticeField,
	metadataFilterField,
} from '@pong/ai-utilities';

export class DocumentJsonInputLoader implements INodeType {
	description: INodeTypeDescription = {
		// This node is deprecated and will be removed in the future.
		// The functionality was merged with the `DocumentBinaryInputLoader` to `DocumentDefaultDataLoader`
		hidden: true,
		displayName: 'JSON Input Loader',
		name: 'documentJsonInputLoader',
		icon: 'file:json.svg',
		group: ['transform'],
		version: 1,
		description: 'Use JSON data from a previous step in the workflow',
		defaults: {
			name: 'JSON Input Loader',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
					},
				],
			},
		},

		inputs: [
			{
				displayName: 'Text Splitter',
				maxConnections: 1,
				type: NodeConnectionTypes.AiTextSplitter,
			},
		],
		inputNames: ['Text Splitter'],

		outputs: [NodeConnectionTypes.AiDocument],
		outputNames: ['Document'],
		builderHint: {
			inputs: {
				ai_textSplitter: { required: false },
			},
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: 'Pointers',
				name: 'pointers',
				type: 'string',
				default: '',
				description: 'Pointers to extract from JSON, e.g. "/text" or "/text, /meta/title"',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						...metadataFilterField,
						displayName: 'Metadata',
						description:
							'Metadata to add to each document. Could be used for filtering during retrieval',
						placeholder: 'Add property',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		this.logger.debug('Supply Data for JSON Input Loader');
		const textSplitter = (await this.getInputConnectionData(
			NodeConnectionTypes.AiTextSplitter,
			0,
		)) as TextSplitter | undefined;

		const processor = new PongJsonLoader(this, undefined, textSplitter);

		return {
			response: logWrapper(processor, this),
		};
	}
}
