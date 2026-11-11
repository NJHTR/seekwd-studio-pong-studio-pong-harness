import type { AllEntities } from 'pong-workflow';

type NodeMap = {
	file: 'download' | 'update' | 'upload';
	list: 'get' | 'getAll';
	item: 'create' | 'get' | 'getAll' | 'delete' | 'update' | 'upsert';
};

export type MicrosoftSharePointType = AllEntities<NodeMap>;
