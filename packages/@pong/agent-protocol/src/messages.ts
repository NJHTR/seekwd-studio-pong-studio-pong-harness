import { z } from 'zod';

import { artifactManifestSchema, artifactUriSchema } from './artifact';
import { envelopeSchema, isoDateTimeSchema, ulidSchema, type MessageKind } from './envelope';

export const MAX_TASK_BRIEF_CHARS = 2000;
export const MAX_ACCEPTANCE_ITEMS = 16;
export const MAX_ACCEPTANCE_CHARS = 500;
export const MAX_INPUT_ARTIFACTS = 16;
export const MAX_CLAIM_CHARS = 2000;
export const MAX_EVIDENCE_ITEMS = 16;
export const MAX_EVIDENCE_CHARS = 2000;
export const MAX_FALSIFIERS = 8;
export const MAX_FALSIFIER_CHARS = 500;
export const MAX_ARTIFACTS_PER_MESSAGE = 16;

export const CHALLENGE_REASONS = [
	'unsupported_claim',
	'contradiction',
	'missing_evidence',
	'scope_creep',
	'regression',
	'ambiguity',
] as const;

export const CHALLENGE_ACTIONS = ['revise', 'retest', 'escalate', 'withdraw'] as const;

export const APPROVAL_REQUEST_KINDS = ['command', 'fileChange', 'permissions', 'input'] as const;

export const APPROVAL_DECISIONS = ['accept', 'decline', 'acceptForSession'] as const;

/** Arbiter verdict, merged into `conclusion_proposed.resolved_by` (no new kind). */
export const ARBITER_DECISIONS = ['accept', 'reject', 'revise'] as const;

export type ChallengeReason = (typeof CHALLENGE_REASONS)[number];
export type ChallengeAction = (typeof CHALLENGE_ACTIONS)[number];
export type ApprovalRequestKind = (typeof APPROVAL_REQUEST_KINDS)[number];
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];
export type ArbiterDecision = (typeof ARBITER_DECISIONS)[number];

export const taskAssignedPayloadSchema = z
	.object({
		/** Executable task brief. Keep it short; large facts travel as artifacts. */
		brief: z.string().min(1).max(MAX_TASK_BRIEF_CHARS),
		/** Deterministic checks a verifier can run or read. */
		acceptance: z
			.array(z.string().min(1).max(MAX_ACCEPTANCE_CHARS))
			.min(1)
			.max(MAX_ACCEPTANCE_ITEMS),
		inputs: z.array(artifactUriSchema).max(MAX_INPUT_ARTIFACTS).default([]),
		deadline: isoDateTimeSchema.optional(),
	})
	.strict();

export type TaskAssignedPayload = z.infer<typeof taskAssignedPayloadSchema>;

/** Artifact publication carries the manifest only; bytes live in the artifact store. */
export const artifactPublishedPayloadSchema = artifactManifestSchema;

export type ArtifactPublishedPayload = z.infer<typeof artifactPublishedPayloadSchema>;

export const conclusionProposedPayloadSchema = z
	.object({
		claim: z.string().min(1).max(MAX_CLAIM_CHARS),
		/** Artifact URIs or reproducible commands. At least one is required. */
		evidence: z.array(z.string().min(1).max(MAX_EVIDENCE_CHARS)).min(1).max(MAX_EVIDENCE_ITEMS),
		artifacts: z.array(artifactUriSchema).max(MAX_ARTIFACTS_PER_MESSAGE).default([]),
		confidence: z.number().min(0).max(1),
		falsifiers: z.array(z.string().min(1).max(MAX_FALSIFIER_CHARS)).max(MAX_FALSIFIERS).default([]),
		/** Set by the arbiter only; `basis[]` is mandatory when present. */
		resolved_by: z
			.object({
				decision: z.enum(ARBITER_DECISIONS),
				basis: z.array(z.string().min(1).max(MAX_EVIDENCE_CHARS)).min(1).max(MAX_EVIDENCE_ITEMS),
			})
			.strict()
			.optional(),
	})
	.strict();

export type ConclusionProposedPayload = z.infer<typeof conclusionProposedPayloadSchema>;

export const conclusionChallengedPayloadSchema = z
	.object({
		/** `id` of the challenged `conclusion_proposed` message. */
		target_id: ulidSchema,
		reason: z.enum(CHALLENGE_REASONS),
		detail: z.string().min(1).max(MAX_CLAIM_CHARS).optional(),
		counter_evidence: z
			.array(z.string().min(1).max(MAX_EVIDENCE_CHARS))
			.min(1)
			.max(MAX_EVIDENCE_ITEMS),
		requested_action: z.enum(CHALLENGE_ACTIONS),
	})
	.strict();

export type ConclusionChallengedPayload = z.infer<typeof conclusionChallengedPayloadSchema>;

const approvalRequestedPayloadBaseSchema = z
	.object({
		request_kind: z.enum(APPROVAL_REQUEST_KINDS),
		title: z.string().min(1).max(200),
		detail: z.string().min(1).max(2000).optional(),
		command: z.string().min(1).max(2000).optional(),
		cwd: z.string().min(1).max(1024).optional(),
		reason: z.string().min(1).max(1000).optional(),
		available_decisions: z.array(z.enum(APPROVAL_DECISIONS)).min(1).max(3),
		/** Network deadline: the UI disables the decision after this instant. */
		expires_at: isoDateTimeSchema,
		/** `request_kind: "input"` carries a question and optional options. */
		question: z.string().min(1).max(2000).optional(),
		options: z.array(z.string().min(1).max(500)).max(16).optional(),
	})
	.strict();

export const approvalRequestedPayloadSchema = approvalRequestedPayloadBaseSchema.superRefine(
	(value, context) => {
		if (value.request_kind === 'command' && value.command === undefined) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['command'],
				message: 'request_kind "command" requires command',
			});
		}

		if (value.request_kind === 'input' && value.question === undefined) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['question'],
				message: 'request_kind "input" requires question',
			});
		}
	},
);

export type ApprovalRequestedPayload = z.infer<typeof approvalRequestedPayloadSchema>;

export const approvalDecidedPayloadSchema = z
	.object({
		decision: z.enum(APPROVAL_DECISIONS),
		/** Answers for `request_kind: "input"`, keyed by question id. */
		answers: z.record(z.array(z.string().min(1).max(2000)).max(8)).optional(),
		reason: z.string().min(1).max(500).optional(),
	})
	.strict();

export type ApprovalDecidedPayload = z.infer<typeof approvalDecidedPayloadSchema>;

export const taskAssignedMessageSchema = envelopeSchema
	.extend({
		kind: z.literal('task_assigned'),
		payload: taskAssignedPayloadSchema,
	})
	.strict();

export const artifactPublishedMessageSchema = envelopeSchema
	.extend({
		kind: z.literal('artifact_published'),
		payload: artifactPublishedPayloadSchema,
	})
	.strict();

export const conclusionProposedMessageSchema = envelopeSchema
	.extend({
		kind: z.literal('conclusion_proposed'),
		payload: conclusionProposedPayloadSchema,
	})
	.strict();

export const conclusionChallengedMessageSchema = envelopeSchema
	.extend({
		kind: z.literal('conclusion_challenged'),
		payload: conclusionChallengedPayloadSchema,
	})
	.strict();

export const approvalRequestedMessageSchema = envelopeSchema
	.extend({
		kind: z.literal('approval_requested'),
		payload: approvalRequestedPayloadSchema,
	})
	.strict();

export const approvalDecidedMessageSchema = envelopeSchema
	.extend({
		kind: z.literal('approval_decided'),
		payload: approvalDecidedPayloadSchema,
	})
	.strict();

const messageUnionSchema = z.discriminatedUnion('kind', [
	taskAssignedMessageSchema,
	artifactPublishedMessageSchema,
	conclusionProposedMessageSchema,
	conclusionChallengedMessageSchema,
	approvalRequestedMessageSchema,
	approvalDecidedMessageSchema,
]);

/** Cross-message invariants that a single payload cannot express. */
export const messageSchema = messageUnionSchema.superRefine((message, context) => {
	if (message.kind === 'approval_decided' && message.parent_id === undefined) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['parent_id'],
			message: 'approval_decided must set parent_id to the approval_requested message id',
		});
	}
});

export type ProtocolMessage = z.infer<typeof messageSchema>;

export type MessageOfKind<Kind extends MessageKind> = Extract<ProtocolMessage, { kind: Kind }>;

export type TaskAssignedMessage = MessageOfKind<'task_assigned'>;
export type ArtifactPublishedMessage = MessageOfKind<'artifact_published'>;
export type ConclusionProposedMessage = MessageOfKind<'conclusion_proposed'>;
export type ConclusionChallengedMessage = MessageOfKind<'conclusion_challenged'>;
export type ApprovalRequestedMessage = MessageOfKind<'approval_requested'>;
export type ApprovalDecidedMessage = MessageOfKind<'approval_decided'>;

/** Validate an unknown wire value as a protocol message. Throws `ZodError`. */
export function parseMessage(input: unknown): ProtocolMessage {
	return messageSchema.parse(input);
}

/** Non-throwing variant of `parseMessage`. */
export function safeParseMessage(input: unknown): z.SafeParseReturnType<unknown, ProtocolMessage> {
	return messageSchema.safeParse(input);
}
