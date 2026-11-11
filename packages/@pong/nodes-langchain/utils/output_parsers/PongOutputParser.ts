import type { IExecuteFunctions, ISupplyDataFunctions, IWebhookFunctions } from 'pong-workflow';
import { NodeConnectionTypes } from 'pong-workflow';

import { PongItemListOutputParser } from './PongItemListOutputParser';
import { PongOutputFixingParser } from './PongOutputFixingParser';
import { PongStructuredOutputParser } from './PongStructuredOutputParser';

export type PongOutputParser =
	| PongOutputFixingParser
	| PongStructuredOutputParser
	| PongItemListOutputParser;

export { PongOutputFixingParser, PongItemListOutputParser, PongStructuredOutputParser };

export async function getOptionalOutputParser(
	ctx: IExecuteFunctions | ISupplyDataFunctions | IWebhookFunctions,
	index: number = 0,
): Promise<PongOutputParser | undefined> {
	let outputParser: PongOutputParser | undefined;

	if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
		outputParser = (await ctx.getInputConnectionData(
			NodeConnectionTypes.AiOutputParser,
			index,
		)) as PongOutputParser;
	}

	return outputParser;
}
