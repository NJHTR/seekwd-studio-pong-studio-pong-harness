import { createArtifactUri, hashArtifactContent } from '../artifact';
import {
	createIdempotencyKey,
	PROTOCOL_V0_1,
	type AgentRole,
	type Envelope,
	type MessageKind,
} from '../envelope';
import { parseMessage, type ProtocolMessage } from '../messages';

/** Fixed valid ULIDs, so fixtures never depend on the clock or randomness. */
export const FIXTURE_ULID = '01JY0R2M4W7K8Q3Z5N6P7T8V9A';
export const FIXTURE_PARENT_ULID = '01JY0R2M4W7K8Q3Z5N6P7T8V9B';
export const FIXTURE_TASK_ULID = '01JY0R2M4W7K8Q3Z5N6P7T8V9C';
export const FIXTURE_SENT_AT = '2026-11-13T03:30:00Z';
export const FIXTURE_IDEMPOTENCY_KEY = createIdempotencyKey('fixture', 'task', '1');
export const FIXTURE_ARTIFACT_CONTENT = 'fixture artifact content';
export const FIXTURE_ARTIFACT_URI = createArtifactUri(
	hashArtifactContent(FIXTURE_ARTIFACT_CONTENT),
);

export interface FixtureEnvelopeOverrides {
	readonly kind?: MessageKind;
	readonly id?: string;
	readonly sent_at?: string;
	readonly from?: { readonly agent_id: string; readonly role: AgentRole };
	readonly to?: { readonly agent_id: string };
	readonly task_id?: string;
	readonly idempotency_key?: string;
	readonly parent_id?: string;
	readonly log_seq?: number;
	readonly notes?: string;
	readonly payload?: unknown;
}

/** Build a valid envelope. Override only what a test needs to vary. */
export function envelopeFixture(overrides: FixtureEnvelopeOverrides = {}): Envelope {
	return {
		protocol: PROTOCOL_V0_1,
		kind: overrides.kind ?? 'task_assigned',
		id: overrides.id ?? FIXTURE_ULID,
		sent_at: overrides.sent_at ?? FIXTURE_SENT_AT,
		from: overrides.from ?? { agent_id: 'planner.1', role: 'planner' },
		to: overrides.to ?? { agent_id: 'coder.1' },
		task_id: overrides.task_id ?? FIXTURE_TASK_ULID,
		idempotency_key: overrides.idempotency_key ?? FIXTURE_IDEMPOTENCY_KEY,
		parent_id: overrides.parent_id,
		log_seq: overrides.log_seq,
		notes: overrides.notes,
		payload: overrides.payload ?? {},
	};
}

/** Build and validate a protocol message from a kind and payload. */
export function makeFixtureMessage(input: {
	readonly kind: MessageKind;
	readonly payload: unknown;
	readonly overrides?: FixtureEnvelopeOverrides;
}): ProtocolMessage {
	const envelope = envelopeFixture({ ...input.overrides, kind: input.kind });

	return parseMessage({ ...envelope, payload: input.payload });
}
