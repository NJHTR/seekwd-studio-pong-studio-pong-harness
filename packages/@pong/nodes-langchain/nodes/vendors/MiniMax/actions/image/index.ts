import type { INodeProperties } from 'pong-workflow';

import * as generate from './generate.operation';

export { generate };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Generate an Image',
				value: 'generate',
				action: 'Generate an image',
				description: 'Create an image from a text prompt',
			},
		],
		default: 'generate',
	},
	...generate.description,
];
