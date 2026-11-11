import { UserError } from 'pong-workflow';

export class DisallowedFilepathError extends UserError {
	constructor(filePath: string) {
		super('Disallowed path detected', { extra: { filePath } });
	}
}
