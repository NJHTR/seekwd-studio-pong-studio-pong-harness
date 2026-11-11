import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'pong-workflow';

export class GumroadApi implements ICredentialType {
	name = 'gumroadApi';

	displayName = 'Gumroad API';

	documentationUrl = 'gumroad';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				access_token: '={{$credentials.accessToken}}',
			},
		},
	};
}
