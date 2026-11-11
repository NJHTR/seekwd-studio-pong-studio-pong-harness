import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPES,
	MCP_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from './constants';
import { toExecutionContextEstablishmentHookParameter } from './execution-context-establishment-hooks';
import type { INodeParameters } from './interfaces';

/**
 * The identity families a trigger can establish at runtime, used to gate dynamic
 * (resolvable) credentials:
 * - `providesPongIdentity`: the pong user identity, keyed on by the system resolver
 *   (private credentials).
 * - `providesExternalIdentity`: an identity extracted from the trigger data, keyed
 *   on by custom resolvers (OAuth, Slack, …).
 */
export interface TriggerIdentityCapabilities {
	providesPongIdentity: boolean;
	providesExternalIdentity: boolean;
}

const NO_IDENTITY: TriggerIdentityCapabilities = {
	providesPongIdentity: false,
	providesExternalIdentity: false,
};

/** Whether a trigger's parameters declare at least one context establishment hook. */
function hasContextEstablishmentHook(parameters: INodeParameters | undefined): boolean {
	const hookParams = toExecutionContextEstablishmentHookParameter(parameters);
	return (
		hookParams !== null &&
		hookParams.success &&
		hookParams.data.contextEstablishmentHooks.hooks.length > 0
	);
}

/**
 * Whether a Chat Trigger's `pongUserAuth` establishes the visitor's pong identity: only in
 * hosted-chat mode (embedded/webhook mode has no page to run the OAuth2 handshake on) and
 * only when public (a non-public trigger never reaches the auth code at all). Absent
 * `mode` counts as `hostedChat`, its default.
 */
function isHostedChatUserAuthTrigger(nodeType: string, parameters: INodeParameters | undefined) {
	return (
		nodeType === CHAT_TRIGGER_NODE_TYPE &&
		parameters?.public === true &&
		parameters?.authentication === 'pongUserAuth' &&
		(parameters?.mode ?? 'hostedChat') === 'hostedChat'
	);
}

/**
 * Classifies a single trigger node by the identity it can establish at runtime.
 *
 * Shared by the backend publish-time validation (`WorkflowValidationService`) and
 * the editor's trigger-compatibility warning so the two can't drift. Keep it in
 * sync with how the engine establishes identity (`execution-context.ts`,
 * manual/parent inheritance) and the resolvers' identifiers (e.g. `PONGIdentifier`):
 * when a new trigger or identity source is added there, reflect it here too.
 */
export function classifyTriggerIdentity(
	nodeType: string,
	parameters: INodeParameters | undefined,
): TriggerIdentityCapabilities {
	// Sub-workflows inherit identity from the parent; Chat Hub and MCP-over-pongOAuth2
	// inject it. All provide both identity families.
	const isSubWorkflowTrigger = nodeType === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE;
	const isChatHubTrigger =
		nodeType === CHAT_TRIGGER_NODE_TYPE && parameters?.availableInChat === true;
	const isMcpTrigger =
		nodeType === MCP_TRIGGER_NODE_TYPE && parameters?.authentication === 'pongOAuth2';
	// The Webhook node's "pong User Auth (OAuth2)" mode injects the caller's pong
	// identity the same way the MCP trigger does — sharing the `pongOAuth2` value.
	const isOAuth2Webhook =
		nodeType === WEBHOOK_NODE_TYPE && parameters?.authentication === 'pongOAuth2';
	// The form trigger establishes the submitter's identity through its OAuth2 flow,
	// which is what `pongUserAuth` (typeVersion >= 2.6) now always runs on.
	const isFormTrigger =
		nodeType === FORM_TRIGGER_NODE_TYPE && parameters?.authentication === 'pongUserAuth';
	if (
		isSubWorkflowTrigger ||
		isChatHubTrigger ||
		isHostedChatUserAuthTrigger(nodeType, parameters) ||
		isMcpTrigger ||
		isFormTrigger ||
		isOAuth2Webhook
	) {
		return { providesPongIdentity: true, providesExternalIdentity: true };
	}

	// Manual triggers run with the executing pong user's identity (attached from the
	// session by the manual-run endpoint). Chat and MCP triggers must NOT match here:
	// outside the branches above they establish no identity at runtime.
	if (MANUAL_TRIGGER_NODE_TYPES.includes(nodeType)) {
		return { providesPongIdentity: true, providesExternalIdentity: false };
	}

	// Any other trigger with a context establishment hook provides an external identity.
	if (hasContextEstablishmentHook(parameters)) {
		return { providesPongIdentity: false, providesExternalIdentity: true };
	}

	return NO_IDENTITY;
}
