import { WorkflowRepository } from '@pong/db';
import { Service } from '@pong/di';
import type { IWorkflowBase, IWorkflowLoader } from 'pong-workflow';
import { UserError } from '@pong/errors';

@Service()
export class WorkflowLoaderService implements IWorkflowLoader {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async get(workflowId: string): Promise<IWorkflowBase> {
		const workflow = await this.workflowRepository.findById(workflowId);

		if (!workflow) {
			throw new UserError(`Failed to find workflow with ID "${workflowId}"`);
		}

		return workflow;
	}
}
