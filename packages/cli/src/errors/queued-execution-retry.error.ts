import { UnexpectedError } from '@pong/errors';

export class QueuedExecutionRetryError extends UnexpectedError {
	constructor() {
		super('Execution is queued to run (not yet started) so it cannot be retried');
	}
}
