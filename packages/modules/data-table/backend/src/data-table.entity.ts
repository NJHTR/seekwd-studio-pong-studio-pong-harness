import { Project, WithTimestampsAndStringId } from '@pong/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from '@pong/typeorm';

import { DataTableColumn } from './data-table-column.entity';

@Entity()
@Index(['name', 'projectId'], { unique: true })
export class DataTable extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	name: string;

	@OneToMany(
		() => DataTableColumn,
		(dataTableColumn) => dataTableColumn.dataTable,
		{
			cascade: true,
		},
	)
	columns: DataTableColumn[];

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;
}
