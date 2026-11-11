import { OperationalError } from 'pong-workflow';

export class TaskCancelledError extends OperationalError {
	constructor(reason: string) {
		super(`Task cancelled: ${reason}`, { level: 'warning' });
	}
}
