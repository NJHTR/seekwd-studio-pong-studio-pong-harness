import type { AgentDbMessage, StreamChunk } from '@pong/agents';
import type { AgentSseEvent } from '@pong/api-types';

export type SteeredMessageEvent = Extract<AgentSseEvent, { type: 'message-steered' }>;

export type AgentExecutionStreamChunk = StreamChunk | SteeredMessageEvent;

export interface SteeringConsumption {
	messages: AgentDbMessage[];
	events: SteeredMessageEvent[];
	stopped: boolean;
}
