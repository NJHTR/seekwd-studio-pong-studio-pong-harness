import { createEventBus } from '@pong/utils/event-bus';

export type FoldersEventMap = {
	'folder-created': {
		projectId: string;
	};
};

export const foldersEventBus = createEventBus<FoldersEventMap>();
