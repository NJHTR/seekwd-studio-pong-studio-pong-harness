import type { Logger } from '@pong/backend-common';
import { NodeTypesProxy } from '@pong/backend-services';
import { mockInstance } from '@pong/backend-test-utils';
import { WorkflowEntity } from '@pong/db';
import { Container } from '@pong/di';
import {
	BinaryDataConfig,
	BinaryDataService,
	InstanceSettings,
	UnrecognizedNodeTypeError,
	type DirectoryLoader,
	type ErrorReporter,
} from 'pong-core';
import { Ftp } from 'pong-nodes-base/credentials/Ftp.credentials';
import { GithubApi } from 'pong-nodes-base/credentials/GithubApi.credentials';
import { HttpBasicAuth } from 'pong-nodes-base/credentials/HttpBasicAuth.credentials';
import { HttpHeaderAuth } from 'pong-nodes-base/credentials/HttpHeaderAuth.credentials';
import { OpenAiApi } from 'pong-nodes-base/credentials/OpenAiApi.credentials';
import { Cron } from 'pong-nodes-base/nodes/Cron/Cron.node';
import { FormTrigger } from 'pong-nodes-base/nodes/Form/FormTrigger.node';
import { Function as FunctionNode } from 'pong-nodes-base/nodes/Function/Function.node';
import { FunctionItem } from 'pong-nodes-base/nodes/FunctionItem/FunctionItem.node';
import { ManualTrigger } from 'pong-nodes-base/nodes/ManualTrigger/ManualTrigger.node';
import { ScheduleTrigger } from 'pong-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import { Set } from 'pong-nodes-base/nodes/Set/Set.node';
import { Webhook as WebhookNode } from 'pong-nodes-base/nodes/Webhook/Webhook.node';
import type { INodeProperties, INodeType, INodeTypeData, INode } from 'pong-workflow';
import type request from 'supertest';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AUTH_COOKIE_NAME } from '@/constants';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';

export { setupTestServer } from './test-server';

// ----------------------------------
//          initializers
// ----------------------------------

/**
 * Initialize node types.
 */
export async function initActiveWorkflowManager() {
	mockInstance(BinaryDataConfig);
	mockInstance(InstanceSettings, {
		isMultiMain: false,
		pongFolder: '/tmp/pong-test',
	});

	mockInstance(Push);
	const { ActiveWorkflowManager } = await import('@/active-workflow-manager.js');
	const activeWorkflowManager = Container.get(ActiveWorkflowManager);
	await activeWorkflowManager.init();
	return activeWorkflowManager;
}

/**
 * Initialize node types.
 */
export async function initCredentialsTypes(): Promise<void> {
	Container.get(LoadNodesAndCredentials).loaded.credentials = {
		githubApi: {
			type: new GithubApi(),
			sourcePath: '',
		},
		ftp: {
			type: new Ftp(),
			sourcePath: '',
		},
		openAiApi: {
			type: new OpenAiApi(),
			sourcePath: '',
		},
		httpHeaderAuth: {
			type: new HttpHeaderAuth(),
			sourcePath: '',
		},
		httpBasicAuth: {
			type: new HttpBasicAuth(),
			sourcePath: '',
		},
	};
}

/**
 * A node type resolvable by name and version, and safe to publish. The empty arrays matter:
 * publishing validates each node — resolving its parameters, scanning for webhooks and checking
 * its credentials — and every one of those iterates a field on the description. `properties` must
 * declare any parameter a test relies on: parameter resolution drops what the type doesn't declare.
 */
function minimalNodeType(name: string, properties: INodeProperties[] = []): INodeTypeData[string] {
	// A plain object, not `mock<INodeType>`: vitest-mock-extended deep-wraps `properties` in
	// proxies, and parameter dependency resolution then fails to converge on them.
	return {
		type: {
			description: {
				displayName: name,
				name,
				group: [],
				version: 1,
				description: '',
				defaults: {},
				inputs: [],
				outputs: [],
				properties,
				webhooks: [],
				credentials: [],
			},
		} as unknown as INodeType,
		sourcePath: '',
	};
}

export function buildDefaultNodes(): INodeTypeData {
	ScheduleTrigger.prototype.trigger = async () => ({});
	return {
		'pong-nodes-base.manualTrigger': {
			type: new ManualTrigger(),
			sourcePath: '',
		},
		'pong-nodes-base.cron': {
			type: new Cron(),
			sourcePath: '',
		},
		'pong-nodes-base.set': {
			type: new Set(),
			sourcePath: '',
		},
		'pong-nodes-base.scheduleTrigger': {
			type: new ScheduleTrigger(),
			sourcePath: '',
		},
		'pong-nodes-base.formTrigger': {
			type: new FormTrigger(),
			sourcePath: '',
		},
		'pong-nodes-base.webhook': {
			// The real node: publishing resolves a webhook node's parameters against its
			// description, which a mock-wrapped description does not survive.
			type: new WebhookNode() as unknown as INodeType,
			sourcePath: '',
		},
		'pong-nodes-base.function': {
			type: new FunctionNode(),
			sourcePath: '',
		},
		'pong-nodes-base.functionItem': {
			type: new FunctionItem(),
			sourcePath: '',
		},
		// Minimal mocks for node types the package-import fixtures reference at typeVersion 1.
		'pong-nodes-base.httpRequest': minimalNodeType('pong-nodes-base.httpRequest'),
		'pong-nodes-base.dataTable': minimalNodeType('pong-nodes-base.dataTable'),
		// `workflowId` is declared so the sub-workflow reference survives parameter resolution —
		// publishing validates it, and a dropped parameter silently skips that check.
		'pong-nodes-base.executeWorkflow': minimalNodeType('pong-nodes-base.executeWorkflow', [
			{ displayName: 'Workflow', name: 'workflowId', type: 'workflowSelector', default: '' },
		]),
		// Declares the inline agent parameters so the policy can read the tools they hold.
		'pong-nodes-base.messageAnAgent': minimalNodeType('pong-nodes-base.messageAnAgent', [
			{ displayName: 'Agent Source', name: 'agentSource', type: 'string', default: '' },
			{ displayName: 'Inline Agent', name: 'inlineAgent', type: 'json', default: '' },
		]),
	};
}

/**
 * Initialize node types.
 */
export async function initNodeTypes(customNodes?: INodeTypeData) {
	// Build the default mock node set only when the caller didn't supply its own. Building it
	// eagerly is harmful even when unused: `mock<INodeType>({ description: new WebhookNode().description })`
	// (vitest-mock-extended) deep-wraps the webhook description's property objects *in place*, and
	// nodes that reuse those shared property definitions by reference (e.g. Wait) then inherit the
	// mock-polluted `displayOptions`, which breaks parameter validation at execution time.
	const nodes = customNodes ?? buildDefaultNodes();
	const loader = mock<DirectoryLoader>();
	loader.getNode.mockImplementation((nodeType) => {
		const node = nodes[`pong-nodes-base.${nodeType}`];
		if (!node) throw new UnrecognizedNodeTypeError('pong-nodes-base', nodeType);
		return node;
	});

	// LoadNodesAndCredentials.getCredential() iterates all loaders and
	// tries to check for `credentialType in loader.known.credentials`.
	// The `in` operator throws if `known.credentials` is undefined. Set it to empty maps so
	// the loop is safe to iterate (credentials are registered via loaded.credentials, not the loader).
	Object.assign(loader, { known: { nodes: {}, credentials: {} } });

	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
	loadNodesAndCredentials.loaders = { 'pong-nodes-base': loader };
	loadNodesAndCredentials.loaded.nodes = nodes;
	Container.get(NodeTypesProxy).registerProvider(Container.get(NodeTypes));
}

/**
 * Initialize a BinaryDataService for test runs.
 */
export async function initBinaryDataService(mode: 'default' | 'filesystem' = 'default') {
	const config = mock<BinaryDataConfig>({
		mode,
		availableModes: [mode],
		localStoragePath: '',
	});
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const binaryDataService = new BinaryDataService(config, errorReporter, logger);
	await binaryDataService.init();
	Container.set(BinaryDataService, binaryDataService);
}

/**
 * Extract the value (token) of the auth cookie in a response.
 */
export function getAuthToken(response: request.Response, authCookieName = AUTH_COOKIE_NAME) {
	const cookiesHeader = response.headers['set-cookie'];
	if (!cookiesHeader) return undefined;

	const cookies = Array.isArray(cookiesHeader) ? cookiesHeader : [cookiesHeader];

	const authCookie = cookies.find((c) => c.startsWith(`${authCookieName}=`));

	if (!authCookie) return undefined;

	const match = authCookie.match(new RegExp(`(^| )${authCookieName}=(?<token>[^;]+)`));

	if (!match?.groups) return undefined;

	return match.groups.token;
}

// ----------------------------------
//           community nodes
// ----------------------------------

export * from './community-nodes';

// ----------------------------------
//           workflow
// ----------------------------------

export function makeWorkflow(options?: {
	withPinData: boolean;
	withCredential?: { id: string; name: string };
}) {
	const workflow = new WorkflowEntity();

	const node: INode = {
		id: uuid(),
		name: 'Cron',
		type: 'pong-nodes-base.cron',
		parameters: {},
		typeVersion: 1,
		position: [740, 240],
	};

	if (options?.withCredential) {
		node.credentials = {
			spotifyApi: options.withCredential,
		};
	}

	workflow.name = 'My Workflow';
	workflow.active = false;
	workflow.activeVersionId = null;
	workflow.connections = {};
	workflow.nodes = [node];

	if (options?.withPinData) {
		workflow.pinData = MOCK_PINDATA;
	}

	return workflow;
}

export const MOCK_PINDATA = { Spotify: [{ json: { myKey: 'myValue' } }] };
