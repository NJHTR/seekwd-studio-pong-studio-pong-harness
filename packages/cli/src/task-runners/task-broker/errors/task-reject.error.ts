import { UserError } from '@pong/errors';

export class TaskRejectError extends UserError {
	constructor(public reason: string) {
		super(`Task rejected with reason: ${reason}`);
	}
}
