import type { AiEvent, IDataObject, IExecuteFunctions, ISupplyDataFunctions } from 'pong-workflow';
import { jsonStringify } from 'pong-workflow';

import { sanitizeCredentialShapedValues } from './redact-secrets';

export function logAiEvent(
	executeFunctions: IExecuteFunctions | ISupplyDataFunctions,
	event: AiEvent,
	data?: IDataObject,
) {
	try {
		const payload =
			event === 'ai-tool-called' && data ? sanitizeCredentialShapedValues(data) : data;
		executeFunctions.logAiEvent(event, payload ? jsonStringify(payload) : undefined);
	} catch (error) {
		executeFunctions.logger.debug(`Error logging AI event: ${event}`);
	}
}
