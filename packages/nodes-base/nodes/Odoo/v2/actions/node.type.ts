import type { AllEntities } from 'pong-workflow';

type NodeMap = {
	activity: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	contact: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	custom: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	opportunity: 'create' | 'delete' | 'get' | 'getAll' | 'update';
};

export type OdooType = AllEntities<NodeMap>;
