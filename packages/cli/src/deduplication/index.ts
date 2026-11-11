import { type IDataDeduplicator } from 'pong-workflow';

import { DeduplicationHelper } from './deduplication-helper';

export function getDataDeduplicationService(): IDataDeduplicator {
	return new DeduplicationHelper();
}
