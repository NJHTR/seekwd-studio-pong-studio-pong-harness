import { EventMessageTypeNames } from 'pong-workflow';

import type { AbstractEventMessage } from '../abstract-event-message';
import { EventMessageAiNode } from '../event-message-ai-node';
import { EventMessageAudit } from '../event-message-audit';
import { EventMessageExecution } from '../event-message-execution';
import { EventMessageGeneric } from '../event-message-generic';
import { EventMessageMcp } from '../event-message-mcp';
import { EventMessageNode } from '../event-message-node';
import { EventMessageQueue } from '../event-message-queue';
import { EventMessageRunner } from '../event-message-runner';
import { EventMessageWorkflow } from '../event-message-workflow';

const messages: Array<[string, AbstractEventMessage]> = [
	['EventMessageAiNode', new EventMessageAiNode({ eventName: 'pong.ai.memory.get.messages' })],
	['EventMessageAudit', new EventMessageAudit({ eventName: 'pong.audit.user.signedup' })],
	['EventMessageExecution', new EventMessageExecution({ eventName: 'pong.execution.throttled' })],
	['EventMessageGeneric', new EventMessageGeneric({ eventName: 'pong.destination.test' })],
	['EventMessageMcp', new EventMessageMcp({ eventName: 'pong.audit.mcp.tool.called' })],
	['EventMessageNode', new EventMessageNode({ eventName: 'pong.node.started' })],
	['EventMessageQueue', new EventMessageQueue({ eventName: 'pong.queue.job.enqueued' })],
	['EventMessageRunner', new EventMessageRunner({ eventName: 'pong.runner.task.requested' })],
	['EventMessageWorkflow', new EventMessageWorkflow({ eventName: 'pong.workflow.started' })],
];

describe('deserialize inherited from AbstractEventMessage', () => {
	test.each(messages)('%s applies options and payload of its own type', (_name, message) => {
		const result = message.deserialize({
			__type: message.__type,
			id: 'some-id',
			eventName: 'pong.destination.test',
			message: 'some message',
			payload: { msg: 'some payload' },
		});

		expect(result).toBe(message);
		expect(message.id).toBe('some-id');
		expect(message.eventName).toBe('pong.destination.test');
		expect(message.message).toBe('some message');
		expect(message.payload).toEqual({ msg: 'some payload' });
	});

	test.each(messages)('%s ignores data of another type', (_name, message) => {
		const { id, eventName, payload } = message;

		message.deserialize({
			__type: EventMessageTypeNames.confirm,
			id: 'other-id',
			eventName: 'pong.destination.test',
			payload: { msg: 'other payload' },
		});

		expect(message.id).toBe(id);
		expect(message.eventName).toBe(eventName);
		expect(message.payload).toBe(payload);
	});
});
