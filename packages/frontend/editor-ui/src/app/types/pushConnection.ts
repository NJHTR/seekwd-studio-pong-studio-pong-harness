import type { PushMessage } from '@pong/api-types';

export type PushMessageQueueItem = {
	message: PushMessage;
	retriesLeft: number;
};
