import type { INodeProperties } from 'pong-workflow';

import { includeInputFields } from './common.descriptions';

export const CurrentDateDescription: INodeProperties[] = [
	{
		displayName:
			'You can also refer to the current date in pong expressions by using <code>{{$now}}</code> or <code>{{$today}}</code>. <a target="_blank" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">More info</a>',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['getCurrentDate'],
			},
		},
	},
	{
		displayName: 'Include Current Time',
		name: 'includeTime',
		type: 'boolean',
		default: true,
		// eslint-disable-next-line pong-nodes-base/node-param-description-boolean-without-whether
		description: 'When deactivated, the time will be set to midnight',
		displayOptions: {
			show: {
				operation: ['getCurrentDate'],
			},
		},
	},
	{
		displayName: 'Output Field Name',
		name: 'outputFieldName',
		type: 'string',
		default: 'currentDate',
		description: 'Name of the field to put the output in',
		displayOptions: {
			show: {
				operation: ['getCurrentDate'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				operation: ['getCurrentDate'],
			},
		},
		default: {},
		options: [
			includeInputFields,
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				placeholder: 'America/New_York',
				default: '',
				description:
					'The timezone to use. If not set, the timezone of the pong instance will be used. Use ‘GMT’ for +00:00 timezone.',
			},
		],
	},
];
