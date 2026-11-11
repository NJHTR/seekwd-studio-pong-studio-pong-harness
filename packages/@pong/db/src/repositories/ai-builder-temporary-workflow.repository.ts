import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';
import type { EntityManager } from '@pong/typeorm';

import { AiBuilderTemporaryWorkflow } from '../entities';

@Service()
export class AiBuilderTemporaryWorkflowRepository extends Repository<AiBuilderTemporaryWorkflow> {
	constructor(dataSource: DataSource) {
		super(AiBuilderTemporaryWorkflow, dataSource.manager);
	}

	async mark(
		workflowId: string,
		threadId: string,
		entityManager: EntityManager = this.manager,
	): Promise<void> {
		await entityManager.upsert(AiBuilderTemporaryWorkflow, { workflowId, threadId }, [
			'workflowId',
		]);
	}

	async unmark(workflowId: string, entityManager: EntityManager = this.manager): Promise<void> {
		await entityManager.delete(AiBuilderTemporaryWorkflow, { workflowId });
	}

	async findByThread(threadId: string): Promise<AiBuilderTemporaryWorkflow[]> {
		return await this.find({
			where: { threadId },
			select: ['workflowId', 'threadId'],
		});
	}

	async existsForWorkflow(workflowId: string): Promise<boolean> {
		return await this.existsBy({ workflowId });
	}
}
