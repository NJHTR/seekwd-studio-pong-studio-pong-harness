import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { AgentMemoryEntryLockEntity } from '../entities/agent-memory-entry-lock.entity';

@Service()
export class AgentMemoryEntryLockRepository extends Repository<AgentMemoryEntryLockEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntryLockEntity, dataSource.manager);
	}
}
