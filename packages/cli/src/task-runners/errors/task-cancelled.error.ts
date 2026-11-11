import { OperationalError } from '@pong/errors';

export class TaskCancelledError extends OperationalError {
	constructor(reason: string) {
		super(`Task cancelled: ${reason}`, { level: 'warning', shouldReport: false });
	}
}
