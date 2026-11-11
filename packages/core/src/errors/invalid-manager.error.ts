import { UserError } from 'pong-workflow';

export class InvalidManagerError extends UserError {
	constructor(mode: string) {
		super(`No binary data manager found for: ${mode}`);
	}
}
