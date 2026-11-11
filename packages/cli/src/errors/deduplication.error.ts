import { UnexpectedError } from '@pong/errors';

export class DeduplicationError extends UnexpectedError {
	constructor(message: string) {
		super(`Deduplication Failed: ${message}`);
	}
}
