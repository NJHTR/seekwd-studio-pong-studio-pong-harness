import { ResponseError } from '@pong/errors';

export class TransferWorkflowError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
