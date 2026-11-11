import type { ICredentialType, INodeProperties } from 'pong-workflow';

export class ChatHubVectorStorePGVectorApi implements ICredentialType {
	name = 'chatHubVectorStorePGVectorApi';

	extends = ['postgres'];

	displayName = 'ChatHub PGVector Store API';

	documentationUrl = 'postgres';

	properties: INodeProperties[] = [
		{
			displayName: 'Table Name Prefix',
			name: 'tableNamePrefix',
			type: 'string',
			default: 'pong_vectors',
			description: 'Prefix for table names. The full table name will be {prefix}_{userId}.',
		},
	];
}
