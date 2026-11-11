import type { AllEntities } from 'pong-workflow';

type NodeMap = {
	channel: 'get' | 'getAll' | 'create' | 'update' | 'deleteChannel';
	message: 'deleteMessage' | 'getAll' | 'get' | 'react' | 'send' | 'sendAndWait';
	member: 'ban' | 'getAll' | 'kick' | 'roleAdd' | 'roleRemove' | 'timeout' | 'unban';
	webhook: 'sendLegacy';
};

export type Discord = AllEntities<NodeMap>;
