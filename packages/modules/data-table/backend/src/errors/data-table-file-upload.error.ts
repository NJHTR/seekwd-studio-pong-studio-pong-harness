import { UserError } from 'pong-workflow';

export class FileUploadError extends UserError {
	constructor(msg: string) {
		super(`Error uploading file: ${msg}`, {
			level: 'warning',
		});
	}
}
