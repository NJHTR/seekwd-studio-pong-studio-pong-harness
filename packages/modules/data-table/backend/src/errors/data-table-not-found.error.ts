import { NotFoundError } from '@pong/errors';

export class DataTableNotFoundError extends NotFoundError {
	constructor(dataTableId: string) {
		super(`Could not find the data table: '${dataTableId}'`);
	}
}
