import { createHash } from 'node:crypto';

import { z } from 'zod';

import { isUlid } from './ulid';

/**
 * Frozen protocol v0.1 constants and the shared envelope header.
 *
 * Field names are snake_case on purpose: this is a wire contract shared with
 * Rust (easyCode) and JSON logs, not an internal TypeScript API.
 */
export const PROTOCOL_FAMILY = 'pong.agent';
export const PROTOCOL_V0_1 = 'pong.agent/0.1';
/** Accept any `0.x` minor so stored logs stay readable after a minor bump. */
export const PROTOCOL_VERSION_PATTERN = /^pong\.agent\/0\.[0-9]+$/;

export const MAX_NOTES_CHARS = 400;
export const MAX_AGENT_ID_CHARS = 128;
export const MAX_TASK_ID_CHARS = 128;

export const AGENT_ROLES = ['planner', 'coder', 'reviewer', 'arbiter'] as const;
export const MESSAGE_KINDS = [
	'task_assigned',
	'artifact_published',
	'conclusion_proposed',
	'conclusion_challenged',
	'approval_requested',
	'approval_decided',
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const ulidSchema = z.string().refine(isUlid, 'must be a 26-character ULID');

export const protocolVersionSchema = z
	.string()
	.regex(PROTOCOL_VERSION_PATTERN, 'protocol must be "pong.agent/0.<minor>"');

export const agentRoleSchema = z.enum(AGENT_ROLES);
export const messageKindSchema = z.enum(MESSAGE_KINDS);

export const agentRefSchema = z
	.object({
		agent_id: z.string().min(1).max(MAX_AGENT_ID_CHARS),
		role: agentRoleSchema,
	})
	.strict();

export const recipientSchema = z
	.object({
		agent_id: z.string().min(1).max(MAX_AGENT_ID_CHARS),
	})
	.strict();

/** ISO-8601 timestamp with timezone (for example `2026-11-13T03:30:00Z`). */
export const isoDateTimeSchema = z.string().datetime({ offset: true });

/**
 * Idempotency keys are content hashes, never free text: the same logical action
 * must produce the same key on retry. See `createIdempotencyKey`.
 */
export const idempotencyKeySchema = z
	.string()
	.regex(/^sha256:[0-9a-f]{64}$/, 'idempotency_key must be "sha256:<64 lowercase hex>"');

export const envelopeSchema = z
	.object({
		protocol: protocolVersionSchema,
		kind: messageKindSchema,
		id: ulidSchema,
		sent_at: isoDateTimeSchema,
		from: agentRefSchema,
		to: recipientSchema,
		task_id: ulidSchema,
		idempotency_key: idempotencyKeySchema,
		parent_id: ulidSchema.optional(),
		/** Assigned by the single blackboard writer; producers must not set it. */
		log_seq: z.number().int().nonnegative().optional(),
		/** Bounded free-text escape hatch. Never used for decisions. */
		notes: z.string().min(1).max(MAX_NOTES_CHARS).optional(),
		payload: z.unknown(),
	})
	.strict();

export type Envelope = z.infer<typeof envelopeSchema>;

/** Canonical separator keeps `('ab','c')` and `('a','bc')` distinct. */
const IDEMPOTENCY_SEPARATOR = '\u0000';

/**
 * Build a deterministic `sha256:` idempotency key from the logical action parts
 * (for example task id, attempt and operation name). Retries must reuse the key.
 */
export function createIdempotencyKey(...parts: readonly string[]): string {
	if (parts.length === 0) {
		throw new RangeError('createIdempotencyKey requires at least one part');
	}

	if (parts.some((part) => part.length === 0)) {
		throw new RangeError('createIdempotencyKey parts must not be empty');
	}

	const canonical = parts.join(IDEMPOTENCY_SEPARATOR);
	const digest = createHash('sha256').update(canonical).digest('hex');

	return `sha256:${digest}`;
}
