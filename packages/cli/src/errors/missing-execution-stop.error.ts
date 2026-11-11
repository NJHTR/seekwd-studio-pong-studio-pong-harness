import { UserError } from '@pong/errors';

export class MissingExecutionStopError extends UserError {
	constructor(executionId: string) {
		super('Failed to find execution to stop', { extra: { executionId } });
	}
}
