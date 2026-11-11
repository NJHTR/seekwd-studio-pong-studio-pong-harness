import type { INodeProperties } from 'pong-workflow';
import { updateDisplayOptions } from 'pong-workflow';

import { groupLocator } from '../common';

const properties: INodeProperties[] = [
	{
		...groupLocator,
		description: 'Select the group you want to retrieve',
	},
	{
		displayName: 'Include Users',
		name: 'includeUsers',
		type: 'boolean',
		default: false,
		description: 'Whether to include a list of users in the group',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
