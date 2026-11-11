import { Service } from '@pong/di';
import { DataSource, In, Repository } from '@pong/typeorm';

import { InsightsMetadata } from './insights-metadata.entity';

@Service()
export class InsightsMetadataRepository extends Repository<InsightsMetadata> {
	constructor(dataSource: DataSource) {
		super(InsightsMetadata, dataSource.manager);
	}

	async upsertWorkflowMetadata(metadata: InsightsMetadata[]) {
		if (metadata.length === 0) return;

		await this.upsert(metadata, ['workflowId']);
	}

	async findByWorkflowIds(workflowIds: string[]) {
		if (workflowIds.length === 0) return [];

		return await this.findBy({ workflowId: In(workflowIds) });
	}
}
