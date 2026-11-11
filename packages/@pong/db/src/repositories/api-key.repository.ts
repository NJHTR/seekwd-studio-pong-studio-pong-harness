import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { ApiKey } from '../entities';

@Service()
export class ApiKeyRepository extends Repository<ApiKey> {
	constructor(dataSource: DataSource) {
		super(ApiKey, dataSource.manager);
	}
}
