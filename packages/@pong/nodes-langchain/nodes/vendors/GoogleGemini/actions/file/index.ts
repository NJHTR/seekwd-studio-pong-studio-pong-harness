import type { INodeProperties } from 'pong-workflow';

import * as upload from './upload.operation';

export { upload };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Upload Media File',
				value: 'upload',
				action: 'Upload a media file',
				description: 'Upload a file to the Google Gemini API for later use',
			},
		],
		default: 'upload',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
	},
	...upload.description,
];
