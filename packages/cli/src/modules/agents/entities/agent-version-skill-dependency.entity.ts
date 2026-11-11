import { WithCreatedAt } from '@pong/db';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

/** Pins one skill version to one published agent version. */
@Entity({ name: 'agent_version_skill_dependency' })
export class AgentVersionSkillDependency extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentVersionId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillId: string;

	@Index()
	@Column({ type: 'uuid' })
	skillVersionId: string;
}
