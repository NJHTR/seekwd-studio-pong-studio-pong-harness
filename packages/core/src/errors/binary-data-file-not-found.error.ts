import { UnexpectedError } from 'pong-workflow';

export class BinaryDataFileNotFoundError extends UnexpectedError {
	constructor(fileId: string) {
		super('Binary data file not found', { extra: { fileId } });
	}
}
