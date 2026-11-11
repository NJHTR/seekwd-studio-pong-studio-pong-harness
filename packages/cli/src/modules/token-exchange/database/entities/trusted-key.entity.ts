import { DateTimeColumn } from '@pong/db';
import type { Relation } from '@pong/typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@pong/typeorm';

import { TrustedKeySourceEntity } from './trusted-key-source.entity';

@Entity('trusted_key')
export class TrustedKeyEntity {
	@PrimaryColumn('varchar', { length: 36 })
	sourceId: string;

	@PrimaryColumn('varchar', { length: 255 })
	kid: string;

	@Column('text')
	data: string;

	@DateTimeColumn()
	createdAt: Date;

	@ManyToOne(() => TrustedKeySourceEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sourceId' })
	source: Relation<TrustedKeySourceEntity>;
}
