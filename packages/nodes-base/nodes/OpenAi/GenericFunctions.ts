import type {
	IExecuteSingleFunctions,
	IPongHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'pong-workflow';
import { NodeApiError } from 'pong-workflow';

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IPongHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}
	return data;
}
