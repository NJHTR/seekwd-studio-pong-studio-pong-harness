import { ForbiddenError } from '@pong/errors';

export class InvalidMfaRecoveryCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid MFA recovery code', hint);
	}
}
