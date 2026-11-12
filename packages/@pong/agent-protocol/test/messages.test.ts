import { describe, expect, it } from 'vitest';

import { PROTOCOL_V0_1, safeParseMessage, type MessageKind } from '../src';
import {
	FIXTURE_ARTIFACT_URI,
	FIXTURE_IDEMPOTENCY_KEY,
	FIXTURE_PARENT_ULID,
	FIXTURE_SENT_AT,
	FIXTURE_TASK_ULID,
	FIXTURE_ULID,
} from '../src/testing/fixtures';

function messageEnvelope(
	kind: MessageKind,
	payload: unknown,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		protocol: PROTOCOL_V0_1,
		kind,
		id: FIXTURE_ULID,
		sent_at: FIXTURE_SENT_AT,
		from: { agent_id: 'planner.1', role: 'planner' },
		to: { agent_id: 'coder.1' },
		task_id: FIXTURE_TASK_ULID,
		idempotency_key: FIXTURE_IDEMPOTENCY_KEY,
		payload,
		...overrides,
	};
}

const validTaskAssignedPayload = {
	brief: 'add parameter validation',
	acceptance: ['pnpm --filter pong-nodes-base test', 'reject empty parameter'],
};

const validArtifactPayload = {
	uri: FIXTURE_ARTIFACT_URI,
	media_type: 'application/vnd.pong.patch+unified-diff',
	bytes: 128,
	summary: 'one file changed',
	parents: [],
};

const validConclusionPayload = {
	claim: 'acceptance AC-1 passes',
	evidence: [FIXTURE_ARTIFACT_URI],
	artifacts: [FIXTURE_ARTIFACT_URI],
	confidence: 0.9,
	falsifiers: ['a failing clean-checkout run'],
};

const validChallengedPayload = {
	target_id: FIXTURE_PARENT_ULID,
	reason: 'missing_evidence',
	counter_evidence: ['command:pnpm test -- --run'],
	requested_action: 'revise',
};

const validApprovalRequestedPayload = {
	request_kind: 'command',
	title: 'Run tests',
	command: 'pnpm --filter pong-nodes-base test',
	cwd: 'C:\\work\\repo',
	reason: 'verification step',
	available_decisions: ['accept', 'decline', 'acceptForSession'],
	expires_at: '2026-11-13T03:35:00Z',
};

const validApprovalDecidedPayload = {
	decision: 'accept',
	reason: 'looks bounded',
};

const validMessages: ReadonlyArray<{ kind: MessageKind; payload: unknown }> = [
	{ kind: 'task_assigned', payload: validTaskAssignedPayload },
	{ kind: 'artifact_published', payload: validArtifactPayload },
	{ kind: 'conclusion_proposed', payload: validConclusionPayload },
	{ kind: 'conclusion_challenged', payload: validChallengedPayload },
	{ kind: 'approval_requested', payload: validApprovalRequestedPayload },
	{ kind: 'approval_decided', payload: validApprovalDecidedPayload },
];

describe('message kinds: accept', () => {
	it('accepts every frozen kind', () => {
		for (const { kind, payload } of validMessages) {
			const overrides = kind === 'approval_decided' ? { parent_id: FIXTURE_ULID } : {};
			const result = safeParseMessage(messageEnvelope(kind, payload, overrides));

			expect(result.success, `kind ${kind} should parse`).toBe(true);
		}
	});

	it('applies defaults for omitted optional payload fields', () => {
		const result = safeParseMessage(messageEnvelope('task_assigned', validTaskAssignedPayload));

		expect(result.success).toBe(true);

		if (result.success && result.data.kind === 'task_assigned') {
			expect(result.data.payload.inputs).toEqual([]);
		}
	});

	it('accepts an artifact manifest with parents', () => {
		const result = safeParseMessage(
			messageEnvelope('artifact_published', {
				...validArtifactPayload,
				parents: [FIXTURE_ARTIFACT_URI],
			}),
		);

		expect(result.success).toBe(true);
	});

	it('accepts an arbiter verdict folded into conclusion_proposed', () => {
		const result = safeParseMessage(
			messageEnvelope('conclusion_proposed', {
				...validConclusionPayload,
				resolved_by: { decision: 'accept', basis: [FIXTURE_ARTIFACT_URI] },
			}),
		);

		expect(result.success).toBe(true);
	});

	it('accepts input approval requests with a question', () => {
		const result = safeParseMessage(
			messageEnvelope('approval_requested', {
				request_kind: 'input',
				title: 'Choose a target directory',
				question: 'Which directory should receive the patch?',
				options: ['packages/a', 'packages/b'],
				available_decisions: ['accept', 'decline'],
				expires_at: '2026-11-13T03:35:00Z',
			}),
		);

		expect(result.success).toBe(true);
	});

	it('accepts answers on an approval decision', () => {
		const result = safeParseMessage(
			messageEnvelope(
				'approval_decided',
				{ decision: 'accept', answers: { question_1: ['packages/a'] } },
				{ parent_id: FIXTURE_ULID },
			),
		);

		expect(result.success).toBe(true);
	});
});

describe('message kinds: reject', () => {
	it('rejects task_assigned with empty acceptance criteria', () => {
		const result = safeParseMessage(
			messageEnvelope('task_assigned', { ...validTaskAssignedPayload, acceptance: [] }),
		);

		expect(result.success).toBe(false);
	});

	it('rejects task_assigned with unknown payload fields', () => {
		const result = safeParseMessage(
			messageEnvelope('task_assigned', { ...validTaskAssignedPayload, extra: 1 }),
		);

		expect(result.success).toBe(false);
	});

	it('rejects artifact_published with a bad URI', () => {
		const result = safeParseMessage(
			messageEnvelope('artifact_published', {
				...validArtifactPayload,
				uri: 'artifact://sha256/not-a-digest',
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects artifact_published with negative bytes', () => {
		const result = safeParseMessage(
			messageEnvelope('artifact_published', { ...validArtifactPayload, bytes: -1 }),
		);

		expect(result.success).toBe(false);
	});

	it('rejects artifact_published with an oversized summary', () => {
		const result = safeParseMessage(
			messageEnvelope('artifact_published', {
				...validArtifactPayload,
				summary: 'x'.repeat(401),
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects conclusion_proposed without evidence', () => {
		const result = safeParseMessage(
			messageEnvelope('conclusion_proposed', { ...validConclusionPayload, evidence: [] }),
		);

		expect(result.success).toBe(false);
	});

	it('rejects conclusion_proposed with confidence outside [0, 1]', () => {
		const result = safeParseMessage(
			messageEnvelope('conclusion_proposed', { ...validConclusionPayload, confidence: 1.1 }),
		);

		expect(result.success).toBe(false);
	});

	it('rejects resolved_by without basis', () => {
		const result = safeParseMessage(
			messageEnvelope('conclusion_proposed', {
				...validConclusionPayload,
				resolved_by: { decision: 'accept', basis: [] },
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects conclusion_challenged with a non-ULID target', () => {
		const result = safeParseMessage(
			messageEnvelope('conclusion_challenged', {
				...validChallengedPayload,
				target_id: 'conclusion-1',
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects conclusion_challenged with an unknown action', () => {
		const result = safeParseMessage(
			messageEnvelope('conclusion_challenged', {
				...validChallengedPayload,
				requested_action: 'shrug',
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects conclusion_challenged with empty counter evidence', () => {
		const result = safeParseMessage(
			messageEnvelope('conclusion_challenged', {
				...validChallengedPayload,
				counter_evidence: [],
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects a command approval without a command', () => {
		const result = safeParseMessage(
			messageEnvelope('approval_requested', {
				...validApprovalRequestedPayload,
				command: undefined,
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects an input approval without a question', () => {
		const result = safeParseMessage(
			messageEnvelope('approval_requested', {
				request_kind: 'input',
				title: 'Need input',
				available_decisions: ['accept', 'decline'],
				expires_at: '2026-11-13T03:35:00Z',
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects an approval without available decisions', () => {
		const result = safeParseMessage(
			messageEnvelope('approval_requested', {
				...validApprovalRequestedPayload,
				available_decisions: [],
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects an approval with an unknown request kind', () => {
		const result = safeParseMessage(
			messageEnvelope('approval_requested', {
				...validApprovalRequestedPayload,
				request_kind: 'network',
			}),
		);

		expect(result.success).toBe(false);
	});

	it('rejects approval_decided without parent_id', () => {
		const result = safeParseMessage(
			messageEnvelope('approval_decided', validApprovalDecidedPayload),
		);

		expect(result.success).toBe(false);
	});

	it('rejects approval_decided with an unknown decision', () => {
		const result = safeParseMessage(
			messageEnvelope(
				'approval_decided',
				{ decision: 'acceptForever' },
				{ parent_id: FIXTURE_ULID },
			),
		);

		expect(result.success).toBe(false);
	});
});
