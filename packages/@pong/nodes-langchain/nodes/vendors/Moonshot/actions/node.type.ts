import type { AllEntities } from 'pong-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze';
};

export type MoonshotType = AllEntities<NodeMap>;
