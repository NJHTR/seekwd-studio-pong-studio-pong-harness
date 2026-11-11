import type { ICredentialType, INodeProperties } from 'pong-workflow';

export class TravisCiApi implements ICredentialType {
	name = 'travisCiApi';

	displayName = 'Travis API';

	documentationUrl = 'travisci';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
