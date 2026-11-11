import { DateTimeColumn, WithTimestamps } from '@pong/db';
import { Column, Entity, PrimaryColumn } from '@pong/typeorm';

@Entity({ name: 'instance_ai_observation_cursors' })
export class InstanceAiObservationCursor extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	observationScopeId: string;

	@Column({ type: 'varchar', length: 36 })
	lastObservedMessageId: string;

	@DateTimeColumn()
	lastObservedAt: Date;
}
