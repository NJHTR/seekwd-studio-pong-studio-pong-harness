import type { Workflow, IWorkflowBase } from 'pong-workflow';
import { UnexpectedError } from '@pong/errors';

export class WorkflowMissingIdError extends UnexpectedError {
	constructor(workflow: Workflow | IWorkflowBase) {
		super('Detected ID-less worklfow', { extra: { workflow } });
	}
}
