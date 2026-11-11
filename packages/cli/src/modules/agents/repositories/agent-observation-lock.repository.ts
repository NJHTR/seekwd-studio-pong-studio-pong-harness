import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { AgentObservationLockEntity } from '../entities/agent-observation-lock.entity';

@Service()
export class AgentObservationLockRepository extends Repository<AgentObservationLockEntity> {
	constructor(dataSource: DataSource) {
		super(AgentObservationLockEntity, dataSource.manager);
	}
}
