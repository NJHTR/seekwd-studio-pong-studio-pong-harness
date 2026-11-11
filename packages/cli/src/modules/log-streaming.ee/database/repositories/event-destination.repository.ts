import { isUniqueConstraintError } from '@pong/db';
import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';
import type { MessageEventBusDestinationOptions } from 'pong-workflow';

import { EventDestinations } from '../entities';

@Service()
export class EventDestinationsRepository extends Repository<EventDestinations> {
	constructor(dataSource: DataSource) {
		super(EventDestinations, dataSource.manager);
	}

	async createIfNew(id: string, destination: MessageEventBusDestinationOptions): Promise<boolean> {
		try {
			await this.insert({ id, destination });
			return true;
		} catch (error) {
			if (isUniqueConstraintError(error)) return false;
			throw error;
		}
	}
}
