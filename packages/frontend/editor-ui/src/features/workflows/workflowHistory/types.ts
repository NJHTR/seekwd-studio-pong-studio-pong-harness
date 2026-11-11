import type { WorkflowHistoryActionTypes, WorkflowVersionId } from '@pong/rest-api-client';

export type WorkflowHistoryAction = {
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
	data: {
		formattedCreatedAt: string;
		versionName?: string | null;
		description?: string | null;
	};
};

export type WorkflowHistoryVersionStatus = 'published' | 'latest' | 'default';
