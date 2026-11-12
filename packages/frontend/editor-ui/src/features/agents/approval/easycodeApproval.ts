import { HOST_EVENT_PLACEMENT } from '@/features/ai/shared/agentsChat/constants';
import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';
import { defineAsyncComponent } from 'vue';
import { z } from 'zod';

import {
	DEFAULT_EASYCODE_QUESTION_ID,
	EASYCODE_APPROVAL_DECISION,
	EASYCODE_APPROVAL_HOST_EVENT,
	EASYCODE_APPROVAL_REQUEST_KIND,
	type EasycodeApprovalAnswers,
	type EasycodeApprovalDecision,
	type EasycodeApprovalPayload,
} from './easycodeApproval.types';

const decisionSchema = z.enum([
	EASYCODE_APPROVAL_DECISION.ACCEPT,
	EASYCODE_APPROVAL_DECISION.DECLINE,
	EASYCODE_APPROVAL_DECISION.ACCEPT_FOR_SESSION,
]);

const requestKindSchema = z.enum([
	EASYCODE_APPROVAL_REQUEST_KIND.COMMAND,
	EASYCODE_APPROVAL_REQUEST_KIND.FILE_CHANGE,
	EASYCODE_APPROVAL_REQUEST_KIND.PERMISSIONS,
	EASYCODE_APPROVAL_REQUEST_KIND.INPUT,
]);

/**
 * The backend sends `null` for an optional field that it does not have. The
 * schema folds `null` into `undefined`, so the card reads one shape.
 */
const optionalStringSchema = z
	.string()
	.nullish()
	.transform((value) => value ?? undefined);

const optionalNumberSchema = z
	.number()
	.finite()
	.nullish()
	.transform((value) => value ?? undefined);

const optionalStringArraySchema = z
	.array(z.string())
	.nullish()
	.transform((value) => value ?? undefined);

const optionalDecisionArraySchema = z
	.array(decisionSchema)
	.nullish()
	.transform((value) => value ?? undefined);

const payloadSchema = z.object({
	approvalId: z.string().min(1),
	threadId: z.string().min(1),
	turnId: optionalStringSchema,
	itemId: optionalStringSchema,
	requestKind: requestKindSchema,
	title: optionalStringSchema,
	detail: optionalStringSchema,
	command: optionalStringSchema,
	cwd: optionalStringSchema,
	reason: optionalStringSchema,
	availableDecisions: optionalDecisionArraySchema,
	expiresAtMs: optionalNumberSchema,
	question: optionalStringSchema,
	options: optionalStringArraySchema,
	questionId: optionalStringSchema,
});

/**
 * The decisions to show when the payload leaves them out. The contract always
 * sends them; the fallback keeps a partial card usable instead of buttonless.
 */
const DEFAULT_DECISIONS: readonly EasycodeApprovalDecision[] = [
	EASYCODE_APPROVAL_DECISION.ACCEPT,
	EASYCODE_APPROVAL_DECISION.DECLINE,
];

/**
 * Validates the payload of `easycode-approval-requested`. Returns `undefined`
 * for another event or a payload without the fields that the card needs, so
 * the chat renders nothing instead of a broken card.
 */
export function parseEasycodeApprovalPayload(value: unknown): EasycodeApprovalPayload | undefined {
	const parsed = payloadSchema.safeParse(value);
	if (!parsed.success) return undefined;

	const decisions = parsed.data.availableDecisions;
	return {
		...parsed.data,
		availableDecisions: decisions && decisions.length > 0 ? decisions : DEFAULT_DECISIONS,
	};
}

/** The approval of a host event, or `undefined` for another event. */
export function parseEasycodeApprovalHostEvent(
	event: AgentsChatHostEvent,
): EasycodeApprovalPayload | undefined {
	if (event.name !== EASYCODE_APPROVAL_HOST_EVENT) return undefined;
	return parseEasycodeApprovalPayload(event.payload);
}

/**
 * The key for the single answer that the card collects. The contract does not
 * put a question id in the payload, so use the id when a backend sends one and
 * the positional id otherwise.
 */
export function easycodeQuestionIdOf(payload: EasycodeApprovalPayload): string {
	return payload.questionId ?? DEFAULT_EASYCODE_QUESTION_ID;
}

/** The `answers` body of an input request, or `undefined` without an answer. */
export function buildEasycodeApprovalAnswers(
	payload: EasycodeApprovalPayload,
	answer: string | undefined,
): EasycodeApprovalAnswers | undefined {
	if (answer === undefined) return undefined;
	return { [easycodeQuestionIdOf(payload)]: [answer] };
}

/** The card of an easyCode approval request, above the reply of the turn. */
export const easycodeApprovalExtension: AgentsChatInteractionExtension = {
	key: 'easycode_approval',
	matchHostEvent: (event) => parseEasycodeApprovalHostEvent(event) !== undefined,
	hostEventComponent: defineAsyncComponent(async () => await import('./EasycodeApprovalCard.vue')),
	hostEventPlacement: HOST_EVENT_PLACEMENT.START,
};

/**
 * The interaction extensions of the pong Agents chat. The chat panel takes them
 * as its `interactionExtensions` prop, like the other hosts of that panel do.
 */
export const easycodeApprovalExtensions: readonly AgentsChatInteractionExtension[] = [
	easycodeApprovalExtension,
];
