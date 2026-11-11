import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { ProcessedData } from '../entities';

@Service()
export class ProcessedDataRepository extends Repository<ProcessedData> {
	constructor(dataSource: DataSource) {
		super(ProcessedData, dataSource.manager);
	}

	/** Deletes the deduplication records of a workflow, in every context. */
	async deleteForWorkflow(workflowId: string): Promise<void> {
		await this.delete({ workflowId });
	}
}
