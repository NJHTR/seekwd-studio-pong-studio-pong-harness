import type { INodeProperties } from 'pong-workflow';
import { updateDisplayOptions } from 'pong-workflow';

import { groupLocator } from '../common';

const properties: INodeProperties[] = [
	{
		...groupLocator,
		description: 'Select the group you want to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
