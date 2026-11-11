import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'pong-workflow';

export class QdrantApi implements ICredentialType {
	name = 'qdrantApi';

	displayName = 'Qdrant API';

	documentationUrl = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: false,
			default: '',
		},
		{
			displayName: 'Qdrant URL',
			name: 'qdrantUrl',
			type: 'string',
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.qdrantUrl}}',
			url: '/collections',
		},
	};
}
