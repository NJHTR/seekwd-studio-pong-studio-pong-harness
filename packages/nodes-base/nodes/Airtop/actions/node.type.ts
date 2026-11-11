import type { AllEntities } from 'pong-workflow';

type NodeMap = {
	agent: 'run';
	session: 'create' | 'save' | 'terminate';
	window: 'create' | 'close' | 'takeScreenshot' | 'load';
	extraction: 'getPaginated' | 'query' | 'scrape';
	interaction: 'click' | 'fill' | 'hover' | 'type';
	file: 'getMany' | 'get' | 'deleteFile' | 'upload' | 'load';
};

export type AirtopType = AllEntities<NodeMap>;
