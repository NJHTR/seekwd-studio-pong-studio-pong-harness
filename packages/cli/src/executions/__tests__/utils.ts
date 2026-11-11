import type { EventMessageTypes as EventMessage } from '@/eventbus/event-message-classes';
import { EventMessageNode } from '@/eventbus/event-message-classes/event-message-node';
import { EventMessageWorkflow } from '@/eventbus/event-message-classes/event-message-workflow';

export const setupMessages = (executionId: string, workflowName: string): EventMessage[] => {
	return [
		new EventMessageWorkflow({
			eventName: 'pong.workflow.started',
			payload: { executionId },
		}),
		new EventMessageNode({
			eventName: 'pong.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Execute workflow"',
				nodeType: 'pong-nodes-base.manualTrigger',
				nodeId: '123',
			},
		}),
		new EventMessageNode({
			eventName: 'pong.node.finished',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Execute workflow"',
				nodeType: 'pong-nodes-base.manualTrigger',
				nodeId: '123',
			},
		}),
		new EventMessageNode({
			eventName: 'pong.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'DebugHelper',
				nodeType: 'pong-nodes-base.debugHelper',
				nodeId: '123',
			},
		}),
	];
};
