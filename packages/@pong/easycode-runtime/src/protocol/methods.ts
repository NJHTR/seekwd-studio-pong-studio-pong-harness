/**
 * Whitelisted wire method names from the easyCode app-server protocol.
 *
 * The whitelist comes from the generated `ClientRequest` / `ServerRequest` /
 * `ServerNotification` unions. `scripts/schema-diff.mjs` fails when a listed
 * method is missing from a fresh `easycode app-server generate-ts` output.
 */

export type ClientMethodName =
	| 'initialize'
	| 'thread/start'
	| 'thread/resume'
	| 'turn/start'
	| 'turn/interrupt';

export type ClientNotificationMethodName = 'initialized';

export type ServerRequestMethodName =
	| 'item/commandExecution/requestApproval'
	| 'item/fileChange/requestApproval'
	| 'item/permissions/requestApproval'
	| 'item/tool/requestUserInput'
	| 'item/tool/call'
	| 'mcpServer/elicitation/request'
	| 'applyPatchApproval'
	| 'execCommandApproval'
	| 'account/chatgptAuthTokens/refresh'
	| 'attestation/generate';

export type ServerNotificationMethodName =
	| 'error'
	| 'thread/started'
	| 'thread/status/changed'
	| 'thread/closed'
	| 'turn/started'
	| 'turn/completed'
	| 'item/started'
	| 'item/completed'
	| 'item/agentMessage/delta'
	| 'item/reasoning/textDelta'
	| 'item/reasoning/summaryTextDelta'
	| 'item/commandExecution/outputDelta'
	| 'item/fileChange/outputDelta'
	| 'serverRequest/resolved'
	| 'warning'
	| 'configWarning'
	| 'account/rateLimits/updated'
	| 'thread/tokenUsage/updated';

export const CLIENT_METHODS = {
	initialize: 'initialize',
	threadStart: 'thread/start',
	threadResume: 'thread/resume',
	turnStart: 'turn/start',
	turnInterrupt: 'turn/interrupt',
} satisfies Record<string, ClientMethodName>;

export const CLIENT_NOTIFICATION_METHODS = {
	initialized: 'initialized',
} satisfies Record<string, ClientNotificationMethodName>;

export const SERVER_REQUEST_METHODS = {
	commandExecutionApproval: 'item/commandExecution/requestApproval',
	fileChangeApproval: 'item/fileChange/requestApproval',
	permissionsApproval: 'item/permissions/requestApproval',
	toolRequestUserInput: 'item/tool/requestUserInput',
	dynamicToolCall: 'item/tool/call',
	mcpElicitation: 'mcpServer/elicitation/request',
	applyPatchApproval: 'applyPatchApproval',
	execCommandApproval: 'execCommandApproval',
	chatgptAuthTokensRefresh: 'account/chatgptAuthTokens/refresh',
	attestationGenerate: 'attestation/generate',
} satisfies Record<string, ServerRequestMethodName>;

export const SERVER_NOTIFICATION_METHODS = {
	error: 'error',
	threadStarted: 'thread/started',
	threadStatusChanged: 'thread/status/changed',
	threadClosed: 'thread/closed',
	turnStarted: 'turn/started',
	turnCompleted: 'turn/completed',
	itemStarted: 'item/started',
	itemCompleted: 'item/completed',
	agentMessageDelta: 'item/agentMessage/delta',
	reasoningTextDelta: 'item/reasoning/textDelta',
	reasoningSummaryTextDelta: 'item/reasoning/summaryTextDelta',
	commandExecutionOutputDelta: 'item/commandExecution/outputDelta',
	fileChangeOutputDelta: 'item/fileChange/outputDelta',
	serverRequestResolved: 'serverRequest/resolved',
	warning: 'warning',
	configWarning: 'configWarning',
	accountRateLimitsUpdated: 'account/rateLimits/updated',
	threadTokenUsageUpdated: 'thread/tokenUsage/updated',
} satisfies Record<string, ServerNotificationMethodName>;

/**
 * Expected wire method names keyed by protocol area. The schema diff tool
 * checks this map against generated bindings, so a rename fails loudly.
 */
export const WHITELISTED_METHODS = {
	client: Object.values(CLIENT_METHODS),
	clientNotification: Object.values(CLIENT_NOTIFICATION_METHODS),
	serverRequest: Object.values(SERVER_REQUEST_METHODS),
	serverNotification: Object.values(SERVER_NOTIFICATION_METHODS),
} as const;

export function isServerRequestMethod(method: string): method is ServerRequestMethodName {
	return Object.values(SERVER_REQUEST_METHODS).some((name) => name === method);
}

export function isServerNotificationMethod(method: string): method is ServerNotificationMethodName {
	return Object.values(SERVER_NOTIFICATION_METHODS).some((name) => name === method);
}
