import type { ObservationLogTaskKind } from '@pong/agents';
import { DateTimeColumn, WithTimestamps } from '@pong/db';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

@Entity({ name: 'agents_observation_locks' })
@Index(['observationScopeId'])
export class AgentObservationLockEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	observationScopeId: string;

	@PrimaryColumn({ type: 'varchar', length: 20 })
	taskKind: ObservationLogTaskKind;

	@Column({ type: 'varchar', length: 64 })
	holderId: string;

	@DateTimeColumn()
	heldUntil: Date;
}
