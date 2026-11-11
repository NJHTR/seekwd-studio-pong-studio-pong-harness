import { UserError } from '@pong/errors';

export class TaskDeferredError extends UserError {
	constructor() {
		super('Task deferred until runner is ready');
	}
}
