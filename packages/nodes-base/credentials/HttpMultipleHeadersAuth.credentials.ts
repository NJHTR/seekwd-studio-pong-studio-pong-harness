/* eslint-disable pong-nodes-base/cred-class-name-unsuffixed */
/* eslint-disable pong-nodes-base/cred-class-field-name-unsuffixed */
import type { IAuthenticate, ICredentialType, INodeProperties, Icon } from 'pong-workflow';

export class HttpMultipleHeadersAuth implements ICredentialType {
	name = 'httpMultipleHeadersAuth';

	displayName = 'Multiple Headers Auth';

	documentationUrl = 'httprequest';

	icon: Icon = 'node:pong-nodes-base.httpRequest';

	properties: INodeProperties[] = [
		{
			displayName: 'Headers',
			name: 'headers',
			type: 'fixedCollection',
			default: { values: [{ name: '', value: '' }] },
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Header',
			options: [
				{
					displayName: 'Header',
					name: 'values',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							typeOptions: {
								password: true,
							},
						},
					],
				},
			],
		},
	];

	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const values = (credentials.headers as { values: Array<{ name: string; value: string }> })
			.values;
		const headers = values.reduce(
			(acc, cur) => {
				acc[cur.name] = cur.value;
				return acc;
			},
			{} as Record<string, string>,
		);
		const newRequestOptions = {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				...headers,
			},
		};
		return await Promise.resolve(newRequestOptions);
	};
}
