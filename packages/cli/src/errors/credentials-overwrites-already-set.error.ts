import { UserError } from '@pong/errors';

export class CredentialsOverwritesAlreadySetError extends UserError {
	constructor() {
		super('Credentials overwrites may not be set more than once.');
	}
}
