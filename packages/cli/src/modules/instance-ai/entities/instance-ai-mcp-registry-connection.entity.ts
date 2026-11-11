import { JsonColumn, WithTimestamps } from '@pong/db';
import type { McpToolPermissions } from '@pong/api-types';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

@Entity({ name: 'instance_ai_mcp_registry_connections' })
@Index(['userId', 'serverSlug', 'credentialId'], { unique: true })
export class InstanceAiMcpRegistryConnection extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 255 })
	serverSlug: string;

	@Column({ type: 'varchar', length: 36 })
	credentialId: string;

	@JsonColumn()
	toolPermissions: McpToolPermissions;
}
