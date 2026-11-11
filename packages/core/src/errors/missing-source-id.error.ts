import { UnexpectedError } from 'pong-workflow';

export class MissingSourceIdError extends UnexpectedError {
	constructor(pathSegments: string[]) {
		super(`Custom file location missing sourceId: ${pathSegments.join('/')}`);
	}
}
