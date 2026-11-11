import { ResponseError } from '@pong/errors';

export class TransferCredentialError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
