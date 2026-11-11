import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { DynamicCredentialResolver } from '../entities/credential-resolver';

@Service()
export class DynamicCredentialResolverRepository extends Repository<DynamicCredentialResolver> {
	constructor(dataSource: DataSource) {
		super(DynamicCredentialResolver, dataSource.manager);
	}
}
