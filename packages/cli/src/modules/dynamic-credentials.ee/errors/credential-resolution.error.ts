import { OperationalError } from '@pong/errors';

export class CredentialResolutionError extends OperationalError {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'CredentialResolutionError';
	}
}
