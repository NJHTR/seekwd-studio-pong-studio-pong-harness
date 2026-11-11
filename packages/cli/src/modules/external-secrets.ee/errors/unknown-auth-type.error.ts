import { UnexpectedError } from '@pong/errors';

export class UnknownAuthTypeError extends UnexpectedError {
	constructor(authType: string) {
		super('Unknown auth type', { extra: { authType } });
	}
}
