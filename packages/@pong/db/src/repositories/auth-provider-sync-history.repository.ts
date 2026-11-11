import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { AuthProviderSyncHistory } from '../entities';

@Service()
export class AuthProviderSyncHistoryRepository extends Repository<AuthProviderSyncHistory> {
	constructor(dataSource: DataSource) {
		super(AuthProviderSyncHistory, dataSource.manager);
	}
}
