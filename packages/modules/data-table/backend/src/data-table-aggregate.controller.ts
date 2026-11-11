import { ListDataTableQueryDto } from '@pong/api-types';
import { AuthenticatedRequest } from '@pong/db';
import { Get, Query, RestController } from '@pong/decorators';

import { DataTableAggregateService } from './data-table-aggregate.service';
import { DataTableService } from './data-table.service';

@RestController('/data-tables-global')
export class DataTableAggregateController {
	constructor(
		private readonly dataTableAggregateService: DataTableAggregateService,
		private readonly dataTableService: DataTableService,
	) {}

	@Get('/')
	async listDataTables(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataTableQueryDto,
	) {
		return await this.dataTableAggregateService.getManyAndCount(req.user, payload);
	}

	@Get('/limits')
	async getDataTablesSize(req: AuthenticatedRequest) {
		return await this.dataTableService.getDataTablesSize(req.user);
	}
}
