import type { INodeProperties } from 'pong-workflow';

export const sharedProperties: INodeProperties[] = [
	{
		// eslint-disable-next-line pong-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Select a table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNames',
		},
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">expression</a>',
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
	},
	{
		// eslint-disable-next-line pong-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Row ID',
		name: 'rowId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getRowIds',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['row'],
			},
			hide: {
				operation: ['create', 'list', 'search'],
			},
		},
	},
];
