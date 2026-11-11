import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { RoleMappingRule } from '../entities';

@Service()
export class RoleMappingRuleRepository extends Repository<RoleMappingRule> {
	constructor(dataSource: DataSource) {
		super(RoleMappingRule, dataSource.manager);
	}
}
