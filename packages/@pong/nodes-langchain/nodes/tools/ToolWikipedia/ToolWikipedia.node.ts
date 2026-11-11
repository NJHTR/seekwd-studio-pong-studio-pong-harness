import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run';
import {
	type IExecuteFunctions,
	BaseError,
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type INodeExecutionData,
	nodeNameToToolName,
} from 'pong-workflow';

import { logWrapper, getConnectionHintNoticeField } from '@pong/ai-utilities';

function getTool(ctx: ISupplyDataFunctions | IExecuteFunctions): WikipediaQueryRun {
	const WikiTool = new WikipediaQueryRun();
	WikiTool.name = nodeNameToToolName(ctx.getNode());
	WikiTool.description =
		'A tool for interacting with and fetching data from the Wikipedia API. The input should always be a string query.';
	return WikiTool;
}

export class ToolWikipedia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wikipedia',
		name: 'toolWikipedia',
		icon: 'file:wikipedia.svg',
		group: ['transform'],
		version: 1,
		description: 'Search in Wikipedia',
		defaults: {
			name: 'Wikipedia',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
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

		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [getConnectionHintNoticeField([NodeConnectionTypes.AiAgent])],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(getTool(this), this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const WikiTool = getTool(this);

		const items = this.getInputData();

		const response: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < this.getInputData().length; itemIndex++) {
			const item = items[itemIndex];
			if (item === undefined) {
				continue;
			}

			let result: string;
			try {
				result = await WikiTool.invoke(item.json);
			} catch (error) {
				if (error instanceof BaseError) throw error;
				// warning-level errors are user-facing and skipped by error reporting;
				// keep programming errors at error level to preserve their visibility
				const isProgrammerError =
					error instanceof TypeError ||
					error instanceof RangeError ||
					error instanceof ReferenceError ||
					error instanceof SyntaxError;
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
					level: isProgrammerError ? 'error' : 'warning',
				});
			}

			response.push({
				json: { response: result },
				pairedItem: { item: itemIndex },
			});
		}

		return [response];
	}
}
