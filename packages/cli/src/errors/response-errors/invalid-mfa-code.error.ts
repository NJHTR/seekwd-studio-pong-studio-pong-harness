import { ForbiddenError } from '@pong/errors';

export class InvalidMfaCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid two-factor code.', hint);
	}
}
