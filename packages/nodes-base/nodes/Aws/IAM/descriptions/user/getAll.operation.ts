import type { INodeProperties } from 'pong-workflow';
import { updateDisplayOptions } from 'pong-workflow';

import { validateUserPath } from '../../helpers/utils';
import { paginationParameters } from '../common';

const properties: INodeProperties[] = [
	...paginationParameters,
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Path Prefix',
				name: 'pathPrefix',
				type: 'string',
				validateType: 'string',
				default: '/',
				description: 'The path prefix for filtering the results',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
				routing: {
					send: {
						preSend: [validateUserPath],
						property: 'PathPrefix',
						value: '={{ $value }}',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
