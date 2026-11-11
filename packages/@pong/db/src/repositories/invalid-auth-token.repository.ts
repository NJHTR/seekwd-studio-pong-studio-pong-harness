import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { InvalidAuthToken } from '../entities';

@Service()
export class InvalidAuthTokenRepository extends Repository<InvalidAuthToken> {
	constructor(dataSource: DataSource) {
		super(InvalidAuthToken, dataSource.manager);
	}
}
