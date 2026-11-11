import { useI18n } from '@pong/i18n';
import { defineFrontendModule } from '@pong/frontend-module-sdk';
import { useRBACStore } from '@pong/stores/rbac.store';
import {
	MCP_AGENTS_VIEW,
	MCP_CLIENTS_VIEW,
	MCP_SETTINGS_VIEW,
	MCP_WORKFLOWS_VIEW,
} from './mcp.constants';

const SettingsMCPView = async () => await import('./SettingsMCPView.vue');
const SettingsMCPWorkflowsView = async () => await import('./SettingsMCPWorkflowsView.vue');
const SettingsMCPAgentsView = async () => await import('./SettingsMCPAgentsView.vue');
const SettingsMCPClientsView = async () => await import('./SettingsMCPClientsView.vue');

export const MCPModule = defineFrontendModule({
	id: 'mcp',
	name: 'MCP Server',
	description: 'Access your pong instance through MCP clients',
	icon: 'mcp',
	routes: [
		{
			path: 'mcp',
			name: MCP_SETTINGS_VIEW,
			component: SettingsMCPView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
		{
			path: 'mcp/workflows',
			name: MCP_WORKFLOWS_VIEW,
			component: SettingsMCPWorkflowsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
		{
			path: 'mcp/agents',
			name: MCP_AGENTS_VIEW,
			component: SettingsMCPAgentsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
		{
			path: 'mcp/clients',
			name: MCP_CLIENTS_VIEW,
			component: SettingsMCPClientsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-mcp',
			order: 10,
			section: 'ai',
			icon: 'mcp',
			get label() {
				return useI18n().baseText('settings.mcp');
			},
			position: 'top',
			route: { to: { name: MCP_SETTINGS_VIEW } },
			get available() {
				return useRBACStore().hasScope([
					'mcp:manage',
					'mcp:oauth',
					'mcpApiKey:create',
					'mcpApiKey:rotate',
				]);
			},
		},
	],
});
