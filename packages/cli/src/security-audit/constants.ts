import { SECURITY_AUDIT_CATEGORIES } from '@pong/api-types';

/**
 * Risk categories
 */

export const RISK_CATEGORIES = [...SECURITY_AUDIT_CATEGORIES];

/**
 * Node types
 */

export const SQL_NODE_TYPES_WITH_QUERY_PARAMS = new Set([
	'pong-nodes-base.postgres',
	'pong-nodes-base.crateDb',
	'pong-nodes-base.questDb',
	'pong-nodes-base.timescaleDb',
]);

export const SQL_NODE_TYPES = new Set([
	...SQL_NODE_TYPES_WITH_QUERY_PARAMS,
	'pong-nodes-base.mySql',
	'pong-nodes-base.microsoftSql',
	'pong-nodes-base.snowflake',
]);

export const WEBHOOK_NODE_TYPE = 'pong-nodes-base.webhook';

export const WEBHOOK_VALIDATOR_NODE_TYPES = new Set([
	'pong-nodes-base.if',
	'pong-nodes-base.switch',
	'pong-nodes-base.code',
	'pong-nodes-base.function',
	'pong-nodes-base.functionItem',
]);

export const FILESYSTEM_INTERACTION_NODE_TYPES = new Set([
	'pong-nodes-base.readPdf',
	'pong-nodes-base.readBinaryFile',
	'pong-nodes-base.readBinaryFiles',
	'pong-nodes-base.spreadsheetFile',
	'pong-nodes-base.writeBinaryFile',
]);

export const OFFICIAL_RISKY_NODE_TYPES = new Set([
	'pong-nodes-base.executeCommand',
	'pong-nodes-base.code',
	'pong-nodes-base.function',
	'pong-nodes-base.functionItem',
	'pong-nodes-base.httpRequest',
	'pong-nodes-base.ssh',
	'pong-nodes-base.ftp',
]);

/**
 * Risk reports
 */

export const DATABASE_REPORT = {
	RISK: 'database',
	SECTIONS: {
		EXPRESSIONS_IN_QUERIES: 'Expressions in "Execute Query" fields in SQL nodes',
		EXPRESSIONS_IN_QUERY_PARAMS: 'Expressions in "Query Parameters" fields in SQL nodes',
		UNUSED_QUERY_PARAMS: 'Unused "Query Parameters" fields in SQL nodes',
	},
} as const;

export const CREDENTIALS_REPORT = {
	RISK: 'credentials',
	SECTIONS: {
		CREDS_NOT_IN_ANY_USE: 'Credentials not used in any workflow',
		CREDS_NOT_IN_ACTIVE_USE: 'Credentials not used in any active workflow',
		CREDS_NOT_RECENTLY_EXECUTED: 'Credentials not used in recently executed workflows',
	},
} as const;

export const FILESYSTEM_REPORT = {
	RISK: 'filesystem',
	SECTIONS: {
		FILESYSTEM_INTERACTION_NODES: 'Nodes that interact with the filesystem',
	},
} as const;

export const NODES_REPORT = {
	RISK: 'nodes',
	SECTIONS: {
		OFFICIAL_RISKY_NODES: 'Official risky nodes',
		COMMUNITY_NODES: 'Community nodes',
		CUSTOM_NODES: 'Custom nodes',
	},
} as const;

export const INSTANCE_REPORT = {
	RISK: 'instance',
	SECTIONS: {
		UNPROTECTED_WEBHOOKS: 'Unprotected webhooks in instance',
		OUTDATED_INSTANCE: 'Outdated instance',
		SECURITY_SETTINGS: 'Security settings',
	},
} as const;

/**
 * URLs
 */

export const ENV_VARS_DOCS_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

export const DB_QUERY_PARAMS_DOCS_URL =
	'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

export const COMMUNITY_NODES_RISKS_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

export const NPM_PACKAGE_URL = 'https://www.npmjs.com/package';
