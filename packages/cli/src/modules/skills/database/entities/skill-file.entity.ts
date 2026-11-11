import { WithTimestamps } from '@pong/db';
import { Column, Entity, PrimaryColumn } from '@pong/typeorm';

/** A file that belongs to one skill version. Only `references/*.md` in v1. */
@Entity({ name: 'skill_file' })
export class SkillFile extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	skillVersionId: string;

	@PrimaryColumn({ type: 'varchar', length: 512 })
	path: string;

	@Column({ type: 'text' })
	content: string;
}
