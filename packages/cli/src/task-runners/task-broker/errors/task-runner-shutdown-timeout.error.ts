import { OperationalError } from '@pong/errors';

export class TaskRunnerShutdownTimeoutError extends OperationalError {
	description =
		'The pong instance began shutting down while the task was still running, so pong stopped the task to finish shutting down in time. Retry the execution, or catch this error in an error workflow.';

	constructor() {
		super('Task aborted because the pong instance was shutting down');
	}
}
