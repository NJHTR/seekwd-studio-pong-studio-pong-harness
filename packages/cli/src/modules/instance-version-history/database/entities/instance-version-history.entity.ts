import { WithCreatedAt } from '@pong/db';
import { Column, Entity, PrimaryGeneratedColumn } from '@pong/typeorm';

@Entity({ name: 'instance_version_history' })
export class InstanceVersionHistory extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int' })
	major: number;

	@Column({ type: 'int' })
	minor: number;

	@Column({ type: 'int' })
	patch: number;
}
