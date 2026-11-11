import type { INodeProperties } from 'pong-workflow';

export const cloneFields: INodeProperties[] = [
	{
		displayName: 'Source Repository',
		name: 'sourceRepository',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['clone'],
			},
		},
		default: '',
		placeholder: 'https://github.com/pong-io/pong',
		description: 'The URL or path of the repository to clone',
		required: true,
	},
];
