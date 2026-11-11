import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { InsightsRaw } from './insights-raw.entity';

@Service()
export class InsightsRawRepository extends Repository<InsightsRaw> {
	constructor(dataSource: DataSource) {
		super(InsightsRaw, dataSource.manager);
	}

	getRawInsightsBatchQuery(compactionBatchSize: number) {
		// Build the query to gather raw insights data for the batch
		const batchQuery = this.manager
			.createQueryBuilder<{
				id: number;
				metaId: number;
				type: string;
				value: number;
				periodStart: Date;
			}>(InsightsRaw, 'insightsRaw')
			.select(
				['id', 'metaId', 'type', 'value'].map((fieldName) =>
					this.manager.connection.driver.escape(fieldName),
				),
			)
			.addSelect('timestamp', 'periodStart')
			.orderBy('timestamp', 'ASC')
			.addOrderBy('id', 'ASC')
			.limit(compactionBatchSize);

		return batchQuery;
	}
}
