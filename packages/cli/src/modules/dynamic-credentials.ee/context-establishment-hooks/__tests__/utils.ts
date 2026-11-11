import type { ContextEstablishmentOptions } from '@pong/decorators';
import type { INodeExecutionData } from 'pong-workflow';

// Factory functions for test data
export const createTriggerItem = (headers?: Record<string, unknown>): INodeExecutionData => ({
	json: { headers },
	pairedItem: { item: 0 },
});

export const createOptions = (
	overrides?: Partial<ContextEstablishmentOptions>,
): ContextEstablishmentOptions =>
	({
		triggerItems: [createTriggerItem({ authorization: 'Bearer test-token-123' })],
		options: {},
		...overrides,
	}) as ContextEstablishmentOptions;
