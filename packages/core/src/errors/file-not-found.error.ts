import { UserError } from 'pong-workflow';

export class FileNotFoundError extends UserError {
	constructor(filePath: string) {
		super('File not found', { extra: { filePath } });
	}
}
