import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'pong-workflow';

export class FreshworksCrmApi implements ICredentialType {
	name = 'freshworksCrmApi';

	displayName = 'Freshworks CRM API';

	documentationUrl = 'freshdesk';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'BDsTn15vHezBlt_XGp3Tig',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'pong-org',
			description:
				'Domain in the Freshworks CRM org URL. For example, in <code>https://pong-org.myfreshworks.com</code>, the domain is <code>pong-org</code>.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Token token={{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials?.domain}}.myfreshworks.com/crm/sales/api',
			url: '/tasks',
			method: 'GET',
		},
	};
}
