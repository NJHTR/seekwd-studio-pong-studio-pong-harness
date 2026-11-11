import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'pong-workflow';

export class PongApi implements ICredentialType {
	name = 'pongApi';

	displayName = 'pong API';

	documentationUrl = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The API key for the pong instance',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://<name>.app.pong.cloud/api/v1',
			description: 'The API URL of the pong instance',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-PONG-API-KEY': '={{ $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/credentials/schema/pongApi',
		},
		rules: [
			// A Base URL without `/api/v1` reaches the editor UI, which answers with HTML and a 200
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'type',
					value: undefined,
					message:
						'The Base URL does not point to the pong API. Make sure it includes the API path, for example /api/v1.',
				},
			},
		],
	};
}
