import { describe, expect, it } from 'vitest';

import {
	createIdempotencyKey,
	createUlid,
	isUlid,
	parseMessage,
	PROTOCOL_V0_1,
	safeParseMessage,
	ulidTimeMs,
} from '../src';
import {
	FIXTURE_IDEMPOTENCY_KEY,
	FIXTURE_SENT_AT,
	FIXTURE_TASK_ULID,
	FIXTURE_ULID,
} from '../src/testing/fixtures';

function validTaskAssigned(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		protocol: PROTOCOL_V0_1,
		kind: 'task_assigned',
		id: FIXTURE_ULID,
		sent_at: FIXTURE_SENT_AT,
		from: { agent_id: 'planner.1', role: 'planner' },
		to: { agent_id: 'coder.1' },
		task_id: FIXTURE_TASK_ULID,
		idempotency_key: FIXTURE_IDEMPOTENCY_KEY,
		payload: { brief: 'fix the parser', acceptance: ['pnpm test'] },
		...overrides,
	};
}

describe('envelope', () => {
	it('accepts a minimal valid message', () => {
		const result = safeParseMessage(validTaskAssigned());

		expect(result.success).toBe(true);
	});

	it('accepts optional parent_id, log_seq and notes', () => {
		const result = safeParseMessage(
			validTaskAssigned({
				parent_id: FIXTURE_ULID,
				log_seq: 42,
				notes: 'handoff summary',
			}),
		);

		expect(result.success).toBe(true);
	});

	it('accepts a non-UTC timestamp offset', () => {
		const result = safeParseMessage(validTaskAssigned({ sent_at: '2026-11-13T03:30:00+08:00' }));

		expect(result.success).toBe(true);
	});

	it('rejects unknown kinds', () => {
		const result = safeParseMessage(validTaskAssigned({ kind: 'progress_reported' }));

		expect(result.success).toBe(false);
	});

	it('rejects a missing required field', () => {
		const message = validTaskAssigned();
		delete message.idempotency_key;

		expect(safeParseMessage(message).success).toBe(false);
	});

	it('rejects unknown top-level fields (frozen envelope)', () => {
		const result = safeParseMessage(validTaskAssigned({ extra: true }));

		expect(result.success).toBe(false);
	});

	it('rejects a protocol major version mismatch', () => {
		const result = safeParseMessage(validTaskAssigned({ protocol: 'pong.agent/1.0' }));

		expect(result.success).toBe(false);
	});

	it('rejects non-ISO timestamps', () => {
		expect(safeParseMessage(validTaskAssigned({ sent_at: '2026-11-13' })).success).toBe(false);
		expect(safeParseMessage(validTaskAssigned({ sent_at: 'yesterday' })).success).toBe(false);
	});

	it('rejects non-hash idempotency keys', () => {
		expect(safeParseMessage(validTaskAssigned({ idempotency_key: 'retry-1' })).success).toBe(false);
		expect(
			safeParseMessage(validTaskAssigned({ idempotency_key: `sha256:${'A'.repeat(64)}` })).success,
		).toBe(false);
	});

	it('rejects notes longer than 400 characters', () => {
		expect(safeParseMessage(validTaskAssigned({ notes: 'x'.repeat(400) })).success).toBe(true);
		expect(safeParseMessage(validTaskAssigned({ notes: 'x'.repeat(401) })).success).toBe(false);
	});

	it('rejects invalid ULIDs for id, task_id and parent_id', () => {
		const invalid = FIXTURE_ULID.slice(0, 25);

		expect(safeParseMessage(validTaskAssigned({ id: invalid })).success).toBe(false);
		expect(safeParseMessage(validTaskAssigned({ task_id: invalid })).success).toBe(false);
		expect(safeParseMessage(validTaskAssigned({ parent_id: invalid })).success).toBe(false);
	});

	it('rejects a ULID with an illegal alphabet character', () => {
		const invalid = `${FIXTURE_ULID.slice(0, 25)}I`;

		expect(isUlid(invalid)).toBe(false);
		expect(safeParseMessage(validTaskAssigned({ id: invalid })).success).toBe(false);
	});

	it('rejects a ULID whose timestamp overflows the first character', () => {
		const invalid = `8${FIXTURE_ULID.slice(1)}`;

		expect(isUlid(invalid)).toBe(false);
	});

	it('rejects negative log_seq', () => {
		expect(safeParseMessage(validTaskAssigned({ log_seq: -1 })).success).toBe(false);
	});

	it('rejects malformed author and recipient refs', () => {
		expect(safeParseMessage(validTaskAssigned({ from: { agent_id: 'planner.1' } })).success).toBe(
			false,
		);
		expect(safeParseMessage(validTaskAssigned({ to: {} })).success).toBe(false);
		expect(
			safeParseMessage(validTaskAssigned({ from: { agent_id: 'x', role: 'intruder' } })).success,
		).toBe(false);
	});

	it('throws on parseMessage for invalid input', () => {
		expect(() => parseMessage(validTaskAssigned({ kind: 'nope' }))).toThrow();
	});
});

describe('ULID', () => {
	it('creates 26-character ULIDs', () => {
		const ulid = createUlid();

		expect(ulid).toHaveLength(26);
		expect(isUlid(ulid)).toBe(true);
	});

	it('round-trips the encoded timestamp', () => {
		const timeMs = 1_760_000_000_000;
		const ulid = createUlid(timeMs);

		expect(ulidTimeMs(ulid)).toBe(timeMs);
	});

	it('encodes the epoch as ten zero characters', () => {
		expect(createUlid(0).slice(0, 10)).toBe('0000000000');
	});

	it('rejects invalid timestamps', () => {
		expect(() => createUlid(-1)).toThrow(RangeError);
		expect(() => createUlid(1.5)).toThrow(RangeError);
	});

	it('rejects invalid ULIDs when decoding', () => {
		expect(() => ulidTimeMs('not-a-ulid')).toThrow(RangeError);
	});
});

describe('idempotency keys', () => {
	it('is deterministic for the same parts', () => {
		expect(createIdempotencyKey('task', 'attempt', '1')).toBe(
			createIdempotencyKey('task', 'attempt', '1'),
		);
	});

	it('is not ambiguous at part boundaries', () => {
		expect(createIdempotencyKey('ab', 'c')).not.toBe(createIdempotencyKey('a', 'bc'));
	});

	it('produces the frozen sha256 format', () => {
		expect(createIdempotencyKey('only')).toMatch(/^sha256:[0-9a-f]{64}$/);
	});

	it('rejects empty input', () => {
		expect(() => createIdempotencyKey()).toThrow(RangeError);
		expect(() => createIdempotencyKey('a', '')).toThrow(RangeError);
	});
});
