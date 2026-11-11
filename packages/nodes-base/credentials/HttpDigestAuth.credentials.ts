import type { ICredentialType, INodeProperties, Icon } from 'pong-workflow';

export class HttpDigestAuth implements ICredentialType {
	name = 'httpDigestAuth';

	displayName = 'Digest Auth';

	documentationUrl = 'httprequest';

	genericAuth = true;

	icon: Icon = 'node:pong-nodes-base.httpRequest';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
			resolvableField: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			resolvableField: true,
		},
	];
}
