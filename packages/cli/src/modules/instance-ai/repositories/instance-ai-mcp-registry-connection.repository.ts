import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { InstanceAiMcpRegistryConnection } from '../entities/instance-ai-mcp-registry-connection.entity';

@Service()
export class InstanceAiMcpRegistryConnectionRepository extends Repository<InstanceAiMcpRegistryConnection> {
	constructor(dataSource: DataSource) {
		super(InstanceAiMcpRegistryConnection, dataSource.manager);
	}
}
