import type { ICredentialType, INodeProperties } from 'pong-workflow';

export class ChatHubVectorStorePineconeApi implements ICredentialType {
	name = 'chatHubVectorStorePineconeApi';

	extends = ['pineconeApi'];

	displayName = 'ChatHub Pinecone Vector Store API';

	documentationUrl = 'pinecone';

	properties: INodeProperties[] = [
		{
			displayName: 'Pinecone Index',
			name: 'pineconeIndex',
			type: 'string',
			default: '',
			required: true,
			description: 'The Pinecone index to use for all users.',
		},
		{
			displayName: 'Namespace Prefix',
			name: 'namespacePrefix',
			type: 'string',
			default: 'pong_vectors',
			description: 'Prefix for namespace names. The full namespace will be {prefix}_{userId}.',
		},
	];
}
