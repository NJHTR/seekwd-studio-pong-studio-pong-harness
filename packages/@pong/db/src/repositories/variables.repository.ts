import { Service } from '@pong/di';
import { DataSource, In, Repository } from '@pong/typeorm';

import { Variables } from '../entities';

@Service()
export class VariablesRepository extends Repository<Variables> {
	constructor(dataSource: DataSource) {
		super(Variables, dataSource.manager);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		await this.delete({ id: In(ids) });
	}
}
