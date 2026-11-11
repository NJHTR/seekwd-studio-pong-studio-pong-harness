import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { InstalledNodes } from './installed-nodes.entity';

@Service()
export class InstalledNodesRepository extends Repository<InstalledNodes> {
	constructor(dataSource: DataSource) {
		super(InstalledNodes, dataSource.manager);
	}
}
