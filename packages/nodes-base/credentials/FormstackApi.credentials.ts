import type { ICredentialType, INodeProperties } from 'pong-workflow';

export class FormstackApi implements ICredentialType {
	name = 'formstackApi';

	displayName = 'Formstack API';

	documentationUrl = 'formstacktrigger';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
