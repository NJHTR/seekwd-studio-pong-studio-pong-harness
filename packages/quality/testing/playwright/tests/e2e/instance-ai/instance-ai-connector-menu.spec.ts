import type { McpRegistryServerResponse } from '@pong/api-types';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const viewport = { width: 1536, height: 1100 };

test.use({
	viewport,
	capability: {
		env: {
			TEST_ISOLATION: 'instance-ai-connector-menu',
			PONG_ENABLED_MODULES: 'instance-ai',
			PONG_INSTANCE_AI_MODEL_API_KEY: 'test-model-key',
			PONG_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			PONG_INSTANCE_AI_BROWSER_USE_ENABLED: 'false',
		},
	},
});

test.describe(
	'pong Assistant connector menu',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test('shows the full Connect menu for an MCP server near the bottom of the modal', async ({
			pong,
			api,
			setupRequirements,
		}) => {
			const credential = await api.credentials.createCredential({
				name: `MCP account ${nanoid()}`,
				type: 'mcpOAuth2Api',
				data: {},
			});
			const servers: McpRegistryServerResponse[] = Array.from({ length: 20 }, (_, index) => ({
				slug: `test-mcp-${index}`,
				nodeTypeName: `@pong/mcp-registry.test-mcp-${index}`,
				name: `test-mcp-${index}`,
				title: `Test MCP server ${String(index).padStart(2, '0')}`,
				description: 'Test MCP connector',
				tagline: 'Test MCP connector',
				version: '1.0.0',
				updatedAt: '2026-09-04T00:00:00.000Z',
				icons: [],
				credentials: [{ credentialType: credential.type, name: 'OAuth2', value: 'oauth2' }],
				tools: [],
				isTemplated: false,
				isOfficial: false,
				status: 'active',
			}));

			try {
				await api.updateInstanceAiSettings({ enabled: true, searchDisabled: true });
				await setupRequirements({
					config: {
						moduleSettings: {
							'instance-ai': {
								enabled: true,
								setupCompleted: true,
								mcpConnectionsAvailable: true,
								workflowBuilderAvailable: true,
								sandboxEnabled: true,
								sandboxUnavailableReason: null,
							},
						},
					},
					intercepts: {
						catalog: {
							url: '**/rest/mcp-registry/servers',
							response: { data: servers },
						},
						connections: {
							url: '**/rest/instance-ai/mcp/connections',
							response: { data: [] },
						},
					},
				});
				await pong.start.fromHome();
				// Load the saved account and its credential type before opening the Assistant.
				await pong.navigate.toCredentials();
				await expect(pong.credentials.cards.getCredential(credential.name)).toBeVisible();
				await pong.instanceAi.getNewThreadButton().click();
				await expect(pong.instanceAi.getChatInput()).toBeEnabled();
				await pong.instanceAi.openConnectors();

				// The same menu works when the server has space below it.
				await pong.instanceAi.getConnectorConnectButton(servers[0].title).click();
				await expect(pong.instanceAi.getConnectorCredentialMenu()).toBeInViewport({ ratio: 1 });
				await pong.instanceAi.getConnectorCreateCredentialButton().click({ trial: true });
				await pong.instanceAi.getConnectorCreateCredentialButton().press('Escape');
				await expect(pong.instanceAi.getConnectorCredentialMenu()).toBeHidden();

				await pong.instanceAi.scrollConnectorsToBottom();
				const connectButton = pong.instanceAi.getConnectorConnectButton(servers[19].title);
				await expect(connectButton).toBeInViewport({ ratio: 1 });
				await connectButton.click();
				const menu = pong.instanceAi.getConnectorCredentialMenu();
				await expect(menu).toBeVisible();
				const menuBounds = await menu.boundingBox();
				// The menu fits on the screen. Its scroll container clips it.
				expect(menuBounds?.y).toBeGreaterThanOrEqual(0);
				expect(menuBounds && menuBounds.y + menuBounds.height).toBeLessThanOrEqual(viewport.height);

				// NODE-5913: The menu must remain visible outside the list's clipped area.
				await expect(
					menu,
					'The Connect menu must be fully visible at the bottom of the modal',
				).toBeInViewport({ ratio: 1 });
				await pong.instanceAi.getConnectorCreateCredentialButton().click({ trial: true });
			} finally {
				await api.credentials.deleteCredential(credential.id);
			}
		});
	},
);
