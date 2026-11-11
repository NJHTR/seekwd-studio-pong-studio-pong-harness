import { DateTimeColumn, WithTimestamps } from '@pong/db';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

@Entity({ name: 'agents_observation_cursors' })
@Index(['observationScopeId'])
export class AgentObservationCursorEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	observationScopeId: string;

	@Column({ type: 'varchar', length: 36 })
	lastObservedMessageId: string;

	@DateTimeColumn()
	lastObservedAt: Date;
}
