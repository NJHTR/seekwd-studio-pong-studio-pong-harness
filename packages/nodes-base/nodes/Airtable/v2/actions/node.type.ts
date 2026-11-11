import type { AllEntities } from 'pong-workflow';

type NodeMap = {
	record: 'create' | 'upsert' | 'deleteRecord' | 'get' | 'search' | 'update';
	base: 'getMany' | 'getSchema';
	table: 'create';
};

export type AirtableType = AllEntities<NodeMap>;
