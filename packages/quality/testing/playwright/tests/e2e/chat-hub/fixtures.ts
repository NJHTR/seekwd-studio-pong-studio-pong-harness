import type { Project } from '@pong/db';
import type { IWorkflowBase } from 'pong-workflow';

import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test as base, expect as baseExpect } from '../../../fixtures/base';
import { PROXY_WITHOUT_COMMUNITY_PACKAGES } from '../../../fixtures/capabilities';
import type { CredentialResponse } from '../../../services/credential-api-helper';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'mock-anthropic-api-key';
const JINA_API_KEY = process.env.JINA_API_KEY ?? 'mock-jina-api-key';

type ChatHubFixtures = {
	project: Project;
	anthropicCredential: CredentialResponse;
	anthropicApiKey: string;
	jinaCredential: CredentialResponse;
	jinaApiKey: string;
	chatHubProxySetup: undefined;
	chatHubEnabled: undefined;
	agentWorkflow: IWorkflowBase;
};

export const chatHubTestConfig = {
	timezoneId: 'America/New_York',
	capability: PROXY_WITHOUT_COMMUNITY_PACKAGES,
} as const;

export const test = base.extend<ChatHubFixtures>({
	anthropicApiKey: async ({}, use) => {
		await use(ANTHROPIC_API_KEY);
	},

	jinaApiKey: async ({}, use) => {
		await use(JINA_API_KEY);
	},

	chatHubProxySetup: [
		async ({ services }, use) => {
			// Setup
			await services.proxy.clearAllExpectations();
			await services.proxy.loadExpectations('chat-hub', { strictBodyMatching: true });

			// In replay (CI), make unmatched LLM calls fail loud with a clear
			// message instead of silently forwarding to the real Anthropic API
			// (which surfaces as a cryptic "invalid x-api-key"). Skip when
			// recording (!CI), which needs fall-through to capture live responses.
			if (process.env.CI) {
				await services.proxy.failOnUnmatched(['/v1/messages']);
			}

			await use(undefined);

			// Teardown
			if (!process.env.CI) {
				await services.proxy.recordExpectations('chat-hub', {
					dedupe: true,
					transform: (expectation) => {
						const response = expectation.httpResponse as {
							headers?: Record<string, string[]>;
						};

						if (response?.headers) {
							delete response.headers['anthropic-organization-id'];
						}

						return expectation;
					},
				});
			}
		},
		{ auto: true },
	],

	chatHubEnabled: [
		async ({ pong }, use) => {
			// Toggling chat hub requires the chatHub:manage scope, which only owners
			// and admins have. The test user may be a member/chat user, so drive this
			// through a dedicated owner context instead of pong.api.
			const ownerApi = await pong.api.createApiForUser(INSTANCE_OWNER_CREDENTIALS);
			const setEnabled = async (enabled: boolean) => {
				const response = await ownerApi.request.put('/rest/chat/enabled', { data: { enabled } });
				if (!response.ok()) {
					throw new Error(
						`Failed to set Chat Hub enabled=${enabled}: ${response.status()} ${await response.text()}`,
					);
				}
			};

			// Chat Hub is disabled by default; turn it on for these tests.
			await setEnabled(true);

			await use(undefined);

			// Restore the default (disabled) state so a shared instance isn't left enabled.
			await setEnabled(false);
			await ownerApi.request.dispose();
		},
		{ auto: true },
	],

	project: async ({ pong }, use) => {
		const project = await pong.api.projects.createProject('ChatHub test project');

		await use(project);

		await pong.api.projects.deleteProject(project.id);
	},

	agentWorkflow: async ({ pong, anthropicCredential, project: _ }, use) => {
		const res = await pong.api.workflows.importWorkflowFromFile('chat-hub-workflow-agent.json', {
			transform: (workflow) => {
				const anthropicNode = workflow.nodes?.find((n) => n.type.includes('lmChatAnthropic'));

				anthropicNode!.credentials!.anthropicApi = anthropicCredential;

				return workflow;
			},
		});

		await use(res.createdWorkflow);

		await pong.api.workflows.archive(res.workflowId);
		await pong.api.workflows.delete(res.workflowId);
	},

	anthropicCredential: async ({ pong, anthropicApiKey, project: _ }, use) => {
		const res = await pong.api.credentials.createCredential({
			name: `Anthropic cred ${crypto.randomUUID().slice(0, 8)}`,
			type: 'anthropicApi',
			data: {
				apiKey: anthropicApiKey,
			},
		});

		await use(res);

		await pong.api.credentials.deleteCredential(res.id);
	},

	jinaCredential: async ({ pong, jinaApiKey }, use) => {
		const res = await pong.api.credentials.createCredential({
			name: `Jina AI cred ${crypto.randomUUID().slice(0, 8)}`,
			type: 'jinaAiApi',
			data: {
				apiKey: jinaApiKey,
			},
		});

		await use(res);

		await pong.api.credentials.deleteCredential(res.id);
	},
});

export const expect = baseExpect;
