import { DateTimeColumn, WithTimestamps } from '@pong/db';
import { Column, Entity, PrimaryColumn } from '@pong/typeorm';

export type InstanceAiObservationTaskKind = 'observer' | 'reflector';

@Entity({ name: 'instance_ai_observation_locks' })
export class InstanceAiObservationLock extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	observationScopeId: string;

	@PrimaryColumn({ type: 'varchar', length: 20 })
	taskKind: InstanceAiObservationTaskKind;

	@Column({ type: 'varchar', length: 64 })
	holderId: string;

	@DateTimeColumn()
	heldUntil: Date;
}
