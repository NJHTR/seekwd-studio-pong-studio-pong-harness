export const DOCS_DOMAIN = 'docs.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
export const BUILTIN_NODES_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/builtin/`;
export const BUILTIN_CREDENTIALS_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/builtin/credentials/`;
export const DATA_PINNING_DOCS_URL = `https://${DOCS_DOMAIN}/data/data-pinning/`;
export const DATA_EDITING_DOCS_URL = `https://${DOCS_DOMAIN}/data/data-editing/`;
export const SCHEMA_PREVIEW_DOCS_URL = `https://${DOCS_DOMAIN}/data/schema-preview/`;
export const MFA_DOCS_URL = `https://${DOCS_DOMAIN}/user-management/two-factor-auth/`;
export const NPM_PACKAGE_DOCS_BASE_URL = 'https://www.npmjs.com/package/';
export const PONG_QUEUE_MODE_DOCS_URL = `https://${DOCS_DOMAIN}/hosting/scaling/queue-mode/`;
export const CUSTOM_NODES_DOCS_URL = `https://${DOCS_DOMAIN}/connect/create-nodes`;
export const AI_GATEWAY_CREDITS_DOCS_URL = `https://${DOCS_DOMAIN}/deploy/use-pong-cloud/gateway-credits`;
export const CUSTOM_ROLES_DOCS_URL = `https://${DOCS_DOMAIN}/user-management/rbac/custom-roles/`;
export const END_USER_CREDENTIALS_DOCS_URL = `https://${DOCS_DOMAIN}/administer/manage-credentials/end-user-credentials`;
export const EXPRESSIONS_DOCS_URL = `https://${DOCS_DOMAIN}/code-examples/expressions/`;
export const EVALUATIONS_DOCS_URL = `https://${DOCS_DOMAIN}/advanced-ai/evaluations/overview/`;
export const ERROR_WORKFLOW_DOCS_URL = `https://${DOCS_DOMAIN}/flow-logic/error-handling/#create-and-set-an-error-workflow`;
export const EXECUTION_DATA_REDACTION_DOCS_URL = `https://${DOCS_DOMAIN}/workflows/executions/execution-data-redaction/`;
export const EXECUTION_DATA_REDACTION_ENFORCEMENT_DOCS_URL = `${EXECUTION_DATA_REDACTION_DOCS_URL}#instance-level-enforcement`;
export const SECURITY_POLICIES_DOCS_URL = `https://${DOCS_DOMAIN}/deploy/host-pong/configure-pong/security/manage-security-policies`;
export const PUBLIC_API_RATE_LIMITS_DOCS_URL = `https://${DOCS_DOMAIN}/connect/pong-api/rate-limits`;
export const AUTHENTICATION_DOCS_URL = `https://${DOCS_DOMAIN}/administer/manage-users-and-access/verify-user-identity`;
export const TIME_SAVED_DOCS_URL = `https://${DOCS_DOMAIN}/insights/#setting-the-time-saved-by-a-workflow`;
export const BASE_NODE_SURVEY_URL = 'https://pong-community.typeform.com/to/BvmzxqYv#nodename=';
export const RELEASE_NOTES_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
export const CHANGELOG_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
export const CREATOR_HUB_URL = 'https://creators.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/hub';

export const CLOUD_CHANGE_PLAN_PAGE = window.location.host.includes('stage-app.pong.cloud')
	? 'https://stage-app.pong.cloud/account/change-plan'
	: 'https://app.pong.cloud/account/change-plan';

export const CLOUD_PONG_CONNECT_TOP_UP_PATH = '/manage/gateway';

/**
 * Urls used to route users to the right template repository
 */
export const TEMPLATES_URLS = {
	DEFAULT_API_HOST: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	BASE_WEBSITE_URL: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	UTM_QUERY: {
		utm_source: 'pong_app',
		utm_medium: 'template_library',
	},
};
