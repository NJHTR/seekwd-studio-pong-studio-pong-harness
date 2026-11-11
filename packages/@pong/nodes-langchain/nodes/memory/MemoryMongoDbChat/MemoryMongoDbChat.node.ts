import { BufferWindowMemory } from '@langchain/classic/memory';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { logWrapper, getConnectionHintNoticeField } from '@pong/ai-utilities';
import { getSessionId } from '@utils/helpers';
import { MongoClient } from 'mongodb';
import { sanitizeMongoUriInMessage } from 'pong-nodes-base/dist/nodes/MongoDb/GenericFunctions';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'pong-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'pong-workflow';

import {
	sessionIdOption,
	sessionKeyProperty,
	expressionSessionKeyProperty,
	contextWindowLengthProperty,
	scopedSessionHint,
} from '../descriptions';

export class MemoryMongoDbChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MongoDB Chat Memory',
		name: 'memoryMongoDbChat',
		icon: 'file:mongodb.svg',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Stores the chat history in MongoDB collection.',
		defaults: {
			name: 'MongoDB Chat Memory',
		},
		credentials: [
			{
				name: 'mongoDb',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			sessionIdOption,
			expressionSessionKeyProperty(1),
			scopedSessionHint(1.1),
			sessionKeyProperty,
			{
				displayName: 'Collection Name',
				name: 'collectionName',
				type: 'string',
				default: 'pong_chat_histories',
				description:
					'The collection name to store the chat history in. If collection does not exist, it will be created.',
			},
			{
				displayName: 'Database Name',
				name: 'databaseName',
				type: 'string',
				default: '',
				description:
					'The database name to store the chat history in. If not provided, the database from credentials will be used.',
			},
			contextWindowLengthProperty,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{
			configurationType: string;
			connectionString: string;
			database: string;
			host: string;
			user: string;
			port: number;
			password: string;
			tls: boolean;
		}>('mongoDb');
		const collectionName = this.getNodeParameter(
			'collectionName',
			itemIndex,
			'pong_chat_histories',
		) as string;
		const databaseName = (this.getNodeParameter('databaseName', itemIndex, '') as string)?.trim();
		const sessionId = getSessionId(this, itemIndex);

		let connectionString: string;
		let dbName: string;

		if (credentials.configurationType === 'connectionString') {
			connectionString = credentials.connectionString.trim();
			dbName = databaseName || credentials.database.trim();
		} else {
			// Build connection string from individual fields
			const host = credentials.host.trim();
			const port = credentials.port;
			const user = credentials.user ? encodeURIComponent(credentials.user) : '';
			const password = credentials.password ? encodeURIComponent(credentials.password) : '';
			const authString = user && password ? `${user}:${password}@` : '';
			const tls = credentials.tls;

			connectionString = `mongodb://${authString}${host}:${port}/?appname=pong`;
			if (tls) {
				connectionString += '&ssl=true';
			}

			dbName = databaseName || credentials.database.trim();
		}

		if (!dbName) {
			throw new NodeOperationError(
				this.getNode(),
				'Database name must be provided either in credentials or in node parameters',
			);
		}

		let client: MongoClient | undefined;
		try {
			client = new MongoClient(connectionString, {
				minPoolSize: 0,
				maxPoolSize: 1,
				maxIdleTimeMS: 30000,
			});
			await client.connect();

			const db = client.db(dbName);
			const collection = db.collection(collectionName);

			const mongoDBChatHistory = new MongoDBChatMessageHistory({
				collection,
				sessionId,
			});

			const memory = new BufferWindowMemory({
				memoryKey: 'chat_history',
				chatHistory: mongoDBChatHistory,
				returnMessages: true,
				inputKey: 'input',
				outputKey: 'output',
				k: this.getNodeParameter('contextWindowLength', itemIndex, 5) as number,
			});

			const connectedClient = client;
			async function closeFunction() {
				await connectedClient.close();
			}

			return {
				closeFunction,
				response: logWrapper(memory, this),
			};
		} catch (error) {
			void client?.close().catch(() => {});
			throw new NodeOperationError(
				this.getNode(),
				`MongoDB connection error: ${sanitizeMongoUriInMessage(error, connectionString)}`,
			);
		}
	}
}
