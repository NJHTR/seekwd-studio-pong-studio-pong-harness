import type { CreateDataTableColumnDto } from '@pong/api-types';
import { randomName } from '@pong/backend-test-utils';
import type { Project } from '@pong/db';
import { Container } from '@pong/di';
import type { DataTableRows } from 'pong-workflow';

import {
	DataTableColumnRepository,
	DataTableRowsRepository,
	DataTableRepository,
} from '@pong/backend-module-data-table';

export const createDataTable = async (
	project: Project,
	options: {
		name?: string;
		columns?: CreateDataTableColumnDto[];
		data?: DataTableRows;
		updatedAt?: Date;
	} = {},
) => {
	const dataTableRepository = Container.get(DataTableRepository);
	const dataTable = await dataTableRepository.createDataTable(
		project.id,
		options.name ?? randomName(),
		options.columns ?? [],
	);

	if (options.updatedAt) {
		await dataTableRepository.update(dataTable.id, {
			updatedAt: options.updatedAt,
		});
		dataTable.updatedAt = options.updatedAt;
	}

	if (options.data) {
		const dataTableColumnRepository = Container.get(DataTableColumnRepository);
		const columns = await dataTableColumnRepository.getColumns(dataTable.id);

		const dataTableRowsRepository = Container.get(DataTableRowsRepository);
		await dataTableRowsRepository.insertRows(dataTable.id, options.data, columns, 'count');
	}

	return dataTable;
};
