import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { InstanceVersionHistory } from '../entities/instance-version-history.entity';

@Service()
export class InstanceVersionHistoryRepository extends Repository<InstanceVersionHistory> {
	constructor(dataSource: DataSource) {
		super(InstanceVersionHistory, dataSource.manager);
	}
}
