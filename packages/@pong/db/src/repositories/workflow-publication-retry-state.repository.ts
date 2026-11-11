import { Service } from '@pong/di';
import { DataSource } from '@pong/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowPublicationRetryState } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowPublicationRetryStateRepository extends BaseRepository<WorkflowPublicationRetryState> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowPublicationRetryState, dataSource.manager, transactionRunner);
	}

	async suppressRetry(
		workflowId: string,
		targetVersionId: string,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.managerFor(ctx).upsert(
			WorkflowPublicationRetryState,
			{ workflowId, targetVersionId },
			['workflowId'],
		);
	}

	async clearRetrySuppression(workflowId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).delete(WorkflowPublicationRetryState, { workflowId });
	}
}
