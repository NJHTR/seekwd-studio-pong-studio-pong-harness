import type { EventMessageAiNode } from './event-message-ai-node';
import type { EventMessageAudit } from './event-message-audit';
import type { EventMessageExecution } from './event-message-execution';
import type { EventMessageGeneric } from './event-message-generic';
import type { EventMessageMcp } from './event-message-mcp';
import type { EventMessageNode } from './event-message-node';
import type { EventMessageQueue } from './event-message-queue';
import type { EventMessageRunner } from './event-message-runner';
import type { EventMessageWorkflow } from './event-message-workflow';

/**
 * Naming rules for log streaming events:
 *
 * Event names are a public contract with log streaming consumers and cannot be
 * renamed once released. Events that record a user action (logins, grants,
 * tool calls, settings changes) must be named under `pong.audit.`: external
 * pipelines filter the audit trail by that prefix, and the destination UI
 * groups events by the first two name segments, so a new top-level prefix
 * creates its own opt-in group outside the audit trail. A group can keep its
 * own name list and message class while living under the audit prefix (see
 * `eventNamesMcp`). Introducing a new operational group (like `pong.runner.`)
 * is a taxonomy decision that needs sign-off from the owning team; the guard
 * test in `__tests__/event-names.test.ts` enforces this.
 */

export const eventNamesAiNodes = [
	'pong.ai.memory.get.messages',
	'pong.ai.memory.added.message',
	'pong.ai.output.parser.parsed',
	'pong.ai.retriever.get.relevant.documents',
	'pong.ai.embeddings.embedded.document',
	'pong.ai.embeddings.embedded.query',
	'pong.ai.document.processed',
	'pong.ai.text.splitter.split',
	'pong.ai.tool.called',
	'pong.ai.vector.store.searched',
	'pong.ai.llm.generated',
	'pong.ai.llm.error',
	'pong.ai.vector.store.populated',
	'pong.ai.vector.store.updated',
] as const;

export type EventNamesAiNodesType = (typeof eventNamesAiNodes)[number];

export const eventNamesRunner = [
	'pong.runner.task.requested',
	'pong.runner.response.received',
] as const;

export type EventNamesRunnerType = (typeof eventNamesRunner)[number];

export const eventNamesQueue = [
	'pong.queue.job.enqueued',
	'pong.queue.job.dequeued',
	'pong.queue.job.completed',
	'pong.queue.job.failed',
	'pong.queue.job.stalled',
] as const;

export type EventNamesQueueType = (typeof eventNamesQueue)[number];

export const eventNamesWorkflow = [
	'pong.workflow.started',
	'pong.workflow.success',
	'pong.workflow.failed',
	'pong.workflow.cancelled',
] as const;
export const eventNamesGeneric = ['pong.worker.started', 'pong.worker.stopped'] as const;
export const eventNamesInstanceReporting = [
	'pong.instanceReporting.success',
	'pong.instanceReporting.failed',
] as const;
export const eventNamesNode = ['pong.node.started', 'pong.node.finished'] as const;
export const eventNamesExecution = [
	'pong.execution.throttled',
	'pong.execution.started-during-bootup',
] as const;
export const eventNamesAudit = [
	'pong.audit.user.login.success',
	'pong.audit.user.login.failed',
	'pong.audit.user.login.emailConflict',
	'pong.audit.user.logout',
	'pong.audit.user.signedup',
	'pong.audit.user.updated',
	'pong.audit.user.deleted',
	'pong.audit.user.invited',
	'pong.audit.user.invitation.accepted',
	'pong.audit.user.reinvited',
	'pong.audit.user.email.failed',
	'pong.audit.user.reset.requested',
	'pong.audit.user.reset',
	'pong.audit.user.credentials.created',
	'pong.audit.user.credentials.shared',
	'pong.audit.user.credentials.updated',
	'pong.audit.user.credentials.deleted',
	'pong.audit.user.credentials.userDisconnected',
	'pong.audit.user.credentials.data.read',
	'pong.audit.user.credentials.list.data.read',
	'pong.audit.user.api.created',
	'pong.audit.user.api.deleted',
	'pong.audit.user.api.rotated',
	'pong.audit.user.mfa.enabled',
	'pong.audit.user.mfa.disabled',
	'pong.audit.user.execution.deleted',
	'pong.audit.workflow.executed',
	'pong.audit.package.installed',
	'pong.audit.package.updated',
	'pong.audit.package.deleted',
	'pong.audit.pong-package.import.success',
	'pong.audit.pong-package.export.success',
	'pong.audit.pong-package.export.failed',
	'pong.audit.pong-package.import.failed',
	'pong.audit.workflow.created',
	'pong.audit.workflow.deleted',
	'pong.audit.workflow.updated',
	'pong.audit.workflow.waiting',
	'pong.audit.workflow.resumed',
	'pong.audit.workflow.archived',
	'pong.audit.workflow.unarchived',
	'pong.audit.workflow.activated',
	'pong.audit.workflow.deactivated',
	'pong.audit.workflow.version.updated',
	'pong.audit.variable.created',
	'pong.audit.variable.updated',
	'pong.audit.variable.deleted',
	'pong.audit.external-secrets.provider.settings.saved',
	'pong.audit.external-secrets.provider.reloaded',
	'pong.audit.external-secrets.connection.created',
	'pong.audit.external-secrets.connection.updated',
	'pong.audit.external-secrets.connection.deleted',
	'pong.audit.external-secrets.connection.tested',
	'pong.audit.external-secrets.connection.reloaded',
	'pong.audit.personal-publishing-restricted.enabled',
	'pong.audit.personal-publishing-restricted.disabled',
	'pong.audit.personal-sharing-restricted.enabled',
	'pong.audit.personal-sharing-restricted.disabled',
	'pong.audit.2fa-enforcement.enabled',
	'pong.audit.2fa-enforcement.disabled',
	'pong.audit.redaction-enforcement.updated',
	'pong.audit.execution.data.revealed',
	'pong.audit.execution.data.reveal_failure',
	'pong.audit.token-exchange.succeeded',
	'pong.audit.token-exchange.failed',
	'pong.audit.token-exchange.embed-login',
	'pong.audit.token-exchange.embed-login-failed',
	'pong.audit.token-exchange.identity-linked',
	'pong.audit.token-exchange.identity-rebound',
	'pong.audit.token-exchange.user-provisioned',
	'pong.audit.token-exchange.role-updated',
	'pong.audit.role-mapping.roles-resolved',
	'pong.audit.role-mapping.rule.created',
	'pong.audit.role-mapping.rule.updated',
	'pong.audit.role-mapping.rule.deleted',
	'pong.audit.role-mapping.rules.bulk-deleted',
	'pong.audit.cluster.version-mismatch.detected',
	'pong.audit.cluster.version-mismatch.resolved',
	'pong.audit.cluster.hostid-clash.detected',
	'pong.audit.cluster.hostid-clash.resolved',
	'pong.audit.cluster.split-brain.detected',
	'pong.audit.cluster.split-brain.resolved',
	'pong.audit.cluster.instance-joined',
	'pong.audit.cluster.instance-left',
	'pong.audit.oauth.callback.binding.rejected',
	'pong.audit.credentials.authorize.rejected',
	'pong.audit.workflow-reviews.enabled',
	'pong.audit.workflow-reviews.disabled',
	'pong.audit.public-api-rate-limit.enabled',
	'pong.audit.public-api-rate-limit.disabled',
	'pong.audit.workflow-review.requested',
	'pong.audit.workflow-review.version-updated',
	'pong.audit.workflow-review.approved',
	'pong.audit.workflow-review.changes-requested',
	'pong.audit.workflow-review.closed',
	'pong.audit.node-type-policy.scope.updated',
	'pong.audit.node-type-policy.document.created',
	'pong.audit.node-type-policy.document.updated',
	'pong.audit.node-type-policy.document.deleted',
	'pong.audit.node-type-policy.attachments.updated',
	'pong.audit.policy.decision.blocked',
	'pong.audit.trusted-source.created',
	'pong.audit.trusted-source.updated',
	'pong.audit.trusted-source.deleted',
	'pong.audit.promotions.provider.created',
	'pong.audit.promotions.provider.updated',
	'pong.audit.promotions.provider.deleted',
	'pong.audit.promotions.environment.created',
	'pong.audit.promotions.environment.updated',
	'pong.audit.promotions.environment.deleted',
] as const;

// Instance MCP server events. Kept as their own list and message class because the payload
// shape differs, but named under `pong.audit.` so they group with audit events in the UI.
export const eventNamesMcp = [
	'pong.audit.mcp.oauth.completed',
	'pong.audit.mcp.tool.called',
	'pong.audit.mcp.access.updated',
] as const;

export type EventNamesMcpType = (typeof eventNamesMcp)[number];

export type EventNamesWorkflowType = (typeof eventNamesWorkflow)[number];
export type EventNamesAuditType = (typeof eventNamesAudit)[number];
export type EventNamesNodeType = (typeof eventNamesNode)[number];
export type EventNamesExecutionType = (typeof eventNamesExecution)[number];
export type EventNamesGenericType = (typeof eventNamesGeneric)[number];
export type EventNamesInstanceReportingType = (typeof eventNamesInstanceReporting)[number];

export type EventNamesTypes =
	| EventNamesAuditType
	| EventNamesWorkflowType
	| EventNamesNodeType
	| EventNamesExecutionType
	| EventNamesGenericType
	| EventNamesInstanceReportingType
	| EventNamesAiNodesType
	| EventNamesRunnerType
	| EventNamesQueueType
	| EventNamesMcpType
	| 'pong.destination.test';

export const eventNamesAll = [
	...eventNamesAudit,
	...eventNamesWorkflow,
	...eventNamesNode,
	...eventNamesGeneric,
	...eventNamesInstanceReporting,
	...eventNamesAiNodes,
	...eventNamesRunner,
	...eventNamesQueue,
	...eventNamesMcp,
];

export type EventMessageTypes =
	| EventMessageGeneric
	| EventMessageWorkflow
	| EventMessageAudit
	| EventMessageNode
	| EventMessageExecution
	| EventMessageAiNode
	| EventMessageQueue
	| EventMessageRunner
	| EventMessageMcp;

export const isNodeEventMessage = (message: EventMessageTypes): message is EventMessageNode =>
	message.eventName.startsWith('pong.node.');
