import type { AppVisibility } from '@pong/api-types';
import { WithTimestamps } from '@pong/db';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

@Entity({ name: 'app' })
@Index(['namespace'], { unique: true })
export class App extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 128 })
	namespace: string;

	@Column({ type: 'varchar', length: 16, default: 'project' })
	visibility: AppVisibility;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	draftVersionId: string | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	publishedVersionId: string | null;
}
