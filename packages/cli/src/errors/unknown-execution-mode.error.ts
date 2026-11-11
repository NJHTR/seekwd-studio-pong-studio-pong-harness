import { UnexpectedError } from '@pong/errors';

export class UnknownExecutionModeError extends UnexpectedError {
	constructor(mode: string) {
		super('Unknown execution mode', { extra: { mode } });
	}
}
