import type { ICredentialType, INodeProperties, Icon } from 'pong-workflow';

export class HttpQueryAuth implements ICredentialType {
	name = 'httpQueryAuth';

	displayName = 'Query Auth';

	documentationUrl = 'httprequest';

	genericAuth = true;

	icon: Icon = 'node:pong-nodes-base.httpRequest';

	properties: INodeProperties[] = [
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
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
