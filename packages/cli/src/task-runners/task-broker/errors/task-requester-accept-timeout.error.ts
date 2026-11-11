import { OperationalError } from '@pong/errors';

export class TaskRequesterAcceptTimeoutError extends OperationalError {
	constructor(taskId: string, requesterId: string) {
		super(`Requester (${requesterId}) took too long to acknowledge task (${taskId})`);
	}
}
