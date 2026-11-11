import { WithCreatedAt } from '@pong/db';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

/**
 * Mirrors the skill refs of an agent draft, disabled refs included. A row with a
 * `skillVersionId` is pinned: that draft reads that saved version instead of the
 * skill's latest saved version, so a new Save does not reach it.
 */
@Entity({ name: 'agent_skill_dependency' })
export class AgentSkillDependency extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	skillId: string;

	@Column({ type: 'uuid', nullable: true })
	skillVersionId: string | null;
}
