import { DateTimeColumn, WithTimestamps } from '@pong/db';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

@Entity({ name: 'agents_memory_entry_locks' })
@Index(['resourceId'])
export class AgentMemoryEntryLockEntity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@PrimaryColumn({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'varchar', length: 64 })
	holderId: string;

	@DateTimeColumn()
	heldUntil: Date;
}
