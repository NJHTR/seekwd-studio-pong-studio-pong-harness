import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalBroker } from '../src/approval';
import type { ApprovalRegistration } from '../src/approval';

function createRegistration(
	respond: (decision: string) => void,
	overrides: Partial<ApprovalRegistration> = {},
): ApprovalRegistration {
	return {
		approvalId: 'request-1:item-1',
		kind: 'commandExecution',
		threadId: 'thread-1',
		turnId: 'turn-1',
		itemId: 'item-1',
		respond: (decision) => {
			respond(decision);
		},
		...overrides,
	};
}

describe('ApprovalBroker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('records an immediate accept decision', () => {
		const respond = vi.fn<(decision: string) => void>();
		const onResolved = vi.fn();
		const broker = new ApprovalBroker({ onResolved });
		broker.register(createRegistration(respond));
		expect(broker.pendingCount).toBe(1);
		expect(broker.decide('request-1:item-1', 'accept')).toBe(true);
		expect(respond).toHaveBeenCalledWith('accept');
		expect(broker.pendingCount).toBe(0);
		expect(onResolved).toHaveBeenCalledTimes(1);
		expect(broker.stats.accepted).toBe(1);
		expect(broker.records[0]?.decision).toBe('accept');
		expect(broker.records[0]?.timedOut).toBe(false);
	});

	it('declines after the default 120s timeout and reports the record', () => {
		const respond = vi.fn<(decision: string) => void>();
		const onTimeout = vi.fn();
		const broker = new ApprovalBroker({ onTimeout });
		broker.register(createRegistration(respond));
		vi.advanceTimersByTime(119_999);
		expect(respond).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(respond).toHaveBeenCalledWith('decline');
		expect(broker.stats.timedOut).toBe(1);
		expect(broker.stats.declined).toBe(1);
		expect(broker.records[0]?.timedOut).toBe(true);
		expect(onTimeout).toHaveBeenCalledTimes(1);
		expect(broker.pendingCount).toBe(0);
	});

	it('honors a per-registration timeout override', () => {
		const respond = vi.fn<(decision: string) => void>();
		const broker = new ApprovalBroker({ defaultTimeoutMs: 120_000 });
		broker.register(createRegistration(respond, { timeoutMs: 500 }));
		vi.advanceTimersByTime(500);
		expect(respond).toHaveBeenCalledWith('decline');
	});

	it('dispose declines every pending approval', () => {
		const first = vi.fn<(decision: string) => void>();
		const second = vi.fn<(decision: string) => void>();
		const broker = new ApprovalBroker();
		broker.register(createRegistration(first, { approvalId: 'a' }));
		broker.register(createRegistration(second, { approvalId: 'b' }));
		broker.dispose();
		expect(first).toHaveBeenCalledWith('decline');
		expect(second).toHaveBeenCalledWith('decline');
		expect(broker.pendingCount).toBe(0);
		expect(() => broker.register(createRegistration(first, { approvalId: 'c' }))).toThrow();
	});

	it('returns false for an unknown approval id and rejects duplicates', () => {
		const respond = vi.fn<(decision: string) => void>();
		const broker = new ApprovalBroker();
		broker.register(createRegistration(respond));
		expect(broker.decide('unknown', 'accept')).toBe(false);
		expect(() => broker.register(createRegistration(respond))).toThrow();
	});

	it('tracks roundtrip latency with the injected clock', () => {
		let nowMs = 1_000;
		const broker = new ApprovalBroker({ now: () => nowMs });
		const respond = vi.fn<(decision: string) => void>();
		broker.register(createRegistration(respond, { receivedAtMs: nowMs }));
		nowMs += 250;
		broker.decide('request-1:item-1', 'accept');
		expect(broker.records[0]?.roundtripMs).toBe(250);
		expect(broker.stats.maxRoundtripMs).toBe(250);
		expect(broker.stats.avgRoundtripMs).toBe(250);
	});
});
