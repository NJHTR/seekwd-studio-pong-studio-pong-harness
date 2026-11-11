import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { AgentObservationCursorEntity } from '../entities/agent-observation-cursor.entity';

@Service()
export class AgentObservationCursorRepository extends Repository<AgentObservationCursorEntity> {
	constructor(dataSource: DataSource) {
		super(AgentObservationCursorEntity, dataSource.manager);
	}
}
