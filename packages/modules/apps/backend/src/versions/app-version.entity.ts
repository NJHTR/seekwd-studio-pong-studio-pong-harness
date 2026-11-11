import type { AppBinding, AppBuildStatus } from '@pong/api-types';
import { DateTimeColumn, JsonColumn, WithTimestamps } from '@pong/db';
import { Column, Entity, Index, PrimaryColumn } from '@pong/typeorm';

@Entity({ name: 'app_version' })
export class AppVersion extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'uuid' })
	appId: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	label: string | null;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Index()
	@Column({ type: 'int' })
	sourceArtifactId: number;

	@Index()
	@Column({ type: 'int', nullable: true })
	bundleArtifactId: number | null;

	@Column({ type: 'int', default: 0 })
	buildAttempts: number;

	@Column({ type: 'varchar', length: 16, default: 'queued' })
	buildStatus: AppBuildStatus;

	@DateTimeColumn({ precision: 3, nullable: true })
	buildStatusUpdatedAt: Date | null;

	@JsonColumn({ default: '[]' })
	bindings: AppBinding[];
}
