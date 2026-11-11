import { WithTimestamps } from '@pong/db';
import { Column, Entity, JoinColumn, OneToMany, PrimaryColumn } from '@pong/typeorm';

import type { InstalledNodes } from './installed-nodes.entity';

@Entity()
export class InstalledPackages extends WithTimestamps {
	@PrimaryColumn()
	packageName: string;

	@Column()
	installedVersion: string;

	@Column()
	authorName?: string;

	@Column()
	authorEmail?: string;

	@OneToMany('InstalledNodes', 'package')
	@JoinColumn({ referencedColumnName: 'package' })
	installedNodes: InstalledNodes[];
}
