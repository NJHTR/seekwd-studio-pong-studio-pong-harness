import type { IWorkflowBase, JsonValue } from 'pong-workflow';

export interface AbstractEventPayload {
	[key: string]: JsonValue | IWorkflowBase | undefined;
}
