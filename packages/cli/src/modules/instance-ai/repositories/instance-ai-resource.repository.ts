import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { InstanceAiResource } from '../entities/instance-ai-resource.entity';

@Service()
export class InstanceAiResourceRepository extends Repository<InstanceAiResource> {
	constructor(dataSource: DataSource) {
		super(InstanceAiResource, dataSource.manager);
	}
}
