import type { INodeProperties } from 'pong-workflow';
import { issueSelect } from '../../shared/descriptions';

const showOnlyForIssueGet = {
	operation: ['get'],
	resource: ['issue'],
};

export const issueGetDescription: INodeProperties[] = [
	{
		...issueSelect,
		displayOptions: { show: showOnlyForIssueGet },
	},
];
