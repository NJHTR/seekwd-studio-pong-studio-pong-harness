import { CommaSeparatedStringArray, Config, Env } from '@pong/config';

import { UnknownModuleError } from './errors/unknown-module.error';

export const MODULE_NAMES = [
	'inbox',
	'agents',
	'agent-evals',
	'insights',
	'external-secrets',
	'community-packages',
	'data-table',
	'oauth-server',
	'mcp',
	// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
	'mcp-discovery',
	// EOF Experiment cleanup
	'provisioning',
	'breaking-changes',
	'source-control',
	'promotions',
	'dynamic-credentials',
	'chat-hub',
	'sso-oidc',
	'sso-saml',
	'log-streaming',
	'ldap',
	'quick-connect',
	'workflow-builder',
	'favorites',
	'redaction',
	'instance-registry',
	'instance-ai',
	'mcp-registry',
	'otel',
	'token-exchange',
	'instance-version-history',
	'encryption-key-manager',
	'oauth-jwe',
	'runtime-credentials',
	'pong-packages',
	'workflow-reviews',
	'engine-v2',
	'policy-infrastructure',
	'type-availability-policies',
	'instance-reporting',
	'inbound-auth-core',
	'scim',
	'skills',
	'apps',
	'knowledge',
	'execution-limits',
	'execution-ledger',
] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];

class ModuleArray extends CommaSeparatedStringArray<ModuleName> {
	constructor(str: string) {
		super(str);

		for (const moduleName of this) {
			if (!MODULE_NAMES.includes(moduleName)) throw new UnknownModuleError(moduleName);
		}
	}
}

@Config
export class ModulesConfig {
	/** Comma-separated list of all enabled modules. */
	@Env('PONG_ENABLED_MODULES')
	enabledModules: ModuleArray = [];

	/** Comma-separated list of all disabled modules. */
	@Env('PONG_DISABLED_MODULES')
	disabledModules: ModuleArray = [];
}
