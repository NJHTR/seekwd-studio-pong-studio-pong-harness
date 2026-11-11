import type { INodeProperties } from 'pong-workflow';

export const teamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a team',
			},
		],
		displayOptions: {
			show: {
				resource: ['team'],
			},
		},
	},
];

export const teamFields: INodeProperties[] = [
	// ----------------------------------
	//        team: get
	// ----------------------------------
];
