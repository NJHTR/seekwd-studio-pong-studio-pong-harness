import type { Document } from '@langchain/core/documents';
import type { INodeExecutionData } from 'pong-workflow';

import { PongBinaryLoader } from '../pong-binary-loader';
import { PongJsonLoader } from '../pong-json-loader';

export async function processDocuments(
	documentInput: PongJsonLoader | PongBinaryLoader | Array<Document<Record<string, unknown>>>,
	inputItems: INodeExecutionData[],
) {
	let processedDocuments: Document[];

	if (documentInput instanceof PongJsonLoader || documentInput instanceof PongBinaryLoader) {
		processedDocuments = await documentInput.processAll(inputItems);
	} else {
		processedDocuments = documentInput;
	}

	const serializedDocuments = processedDocuments.map(({ metadata, pageContent }) => ({
		json: { metadata, pageContent },
	}));

	return {
		processedDocuments,
		serializedDocuments,
	};
}
export async function processDocument(
	documentInput: PongJsonLoader | PongBinaryLoader | Array<Document<Record<string, unknown>>>,
	inputItem: INodeExecutionData,
	itemIndex: number,
) {
	let processedDocuments: Document[];

	if (documentInput instanceof PongJsonLoader || documentInput instanceof PongBinaryLoader) {
		processedDocuments = await documentInput.processItem(inputItem, itemIndex);
	} else {
		processedDocuments = documentInput;
	}

	const serializedDocuments = processedDocuments.map(({ metadata, pageContent }) => ({
		json: { metadata, pageContent },
		pairedItem: {
			item: itemIndex,
		},
	}));

	return {
		processedDocuments,
		serializedDocuments,
	};
}
