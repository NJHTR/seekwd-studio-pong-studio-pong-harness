/**
 * Pending approval broker.
 *
 * A server approval request creates a pending entry with a deadline (default
 * 120s). The host UI decides through `decide`. If the deadline expires first,
 * the broker answers `decline` and records an audit entry. The decision goes
 * back on the same connection, because the server blocks the turn while the
 * request is outstanding.
 */

export type ApprovalKind =
	| 'commandExecution'
	| 'fileChange'
	| 'permissions'
	| 'userInput'
	| 'legacy';

export type ApprovalDecision = 'accept' | 'acceptForSession' | 'decline' | 'cancel';

export interface ApprovalRegistration {
	/** Stable host-side id, for example `${requestId}:${itemId}`. */
	approvalId: string;
	kind: ApprovalKind;
	threadId: string;
	turnId: string;
	itemId: string;
	receivedAtMs?: number;
	/** Overrides the broker default. */
	timeoutMs?: number;
	/** Sends the decision to the server. */
	respond: (decision: ApprovalDecision) => void;
}

export interface ApprovalRecord {
	approvalId: string;
	kind: ApprovalKind;
	threadId: string;
	turnId: string;
	itemId: string;
	decision: ApprovalDecision;
	receivedAtMs: number;
	decidedAtMs: number;
	roundtripMs: number;
	timedOut: boolean;
}

export interface PendingApprovalView {
	approvalId: string;
	kind: ApprovalKind;
	threadId: string;
	turnId: string;
	itemId: string;
	receivedAtMs: number;
	deadlineAtMs: number;
}

export interface ApprovalBrokerOptions {
	/** Default deadline. Default: 120_000 ms. */
	defaultTimeoutMs?: number;
	now?: () => number;
	/** Kept audit records. Default: 1000. */
	maxAuditRecords?: number;
	onResolved?: (record: ApprovalRecord) => void;
	onTimeout?: (approval: PendingApprovalView) => void;
}

export interface ApprovalStats {
	pending: number;
	accepted: number;
	declined: number;
	cancelled: number;
	timedOut: number;
	maxRoundtripMs: number;
	avgRoundtripMs: number;
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_AUDIT_RECORDS = 1000;

interface PendingEntry {
	registration: ApprovalRegistration;
	deadlineAtMs: number;
	timer: NodeJS.Timeout;
}

export class ApprovalBroker {
	private readonly pending = new Map<string, PendingEntry>();
	private readonly audit: ApprovalRecord[] = [];
	private readonly defaultTimeoutMs: number;
	private readonly now: () => number;
	private readonly maxAuditRecords: number;
	private readonly onResolved: ((record: ApprovalRecord) => void) | undefined;
	private readonly onTimeout: ((approval: PendingApprovalView) => void) | undefined;
	private readonly counters = {
		accepted: 0,
		declined: 0,
		cancelled: 0,
		timedOut: 0,
		roundtripTotalMs: 0,
		roundtripCount: 0,
		maxRoundtripMs: 0,
	};
	private disposed = false;

	constructor(options: ApprovalBrokerOptions = {}) {
		this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;
		this.now = options.now ?? (() => Date.now());
		this.maxAuditRecords = options.maxAuditRecords ?? DEFAULT_MAX_AUDIT_RECORDS;
		this.onResolved = options.onResolved;
		this.onTimeout = options.onTimeout;
	}

	register(registration: ApprovalRegistration): PendingApprovalView {
		if (this.disposed) throw new Error('approval broker is disposed');
		if (this.pending.has(registration.approvalId)) {
			throw new Error(`approval ${registration.approvalId} is already pending`);
		}
		const receivedAtMs = registration.receivedAtMs ?? this.now();
		const timeoutMs = registration.timeoutMs ?? this.defaultTimeoutMs;
		const deadlineAtMs = receivedAtMs + timeoutMs;
		const timer = setTimeout(() => {
			this.expire(registration.approvalId);
		}, timeoutMs);
		this.pending.set(registration.approvalId, {
			registration: { ...registration, receivedAtMs },
			deadlineAtMs,
			timer,
		});
		return this.view(registration.approvalId);
	}

	decide(approvalId: string, decision: ApprovalDecision): boolean {
		const entry = this.pending.get(approvalId);
		if (entry === undefined) return false;
		this.pending.delete(approvalId);
		clearTimeout(entry.timer);
		this.finish(entry, decision, false);
		return true;
	}

	/** Decline every pending approval and stop timers. Used at host shutdown. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		for (const [approvalId, entry] of this.pending) {
			this.pending.delete(approvalId);
			clearTimeout(entry.timer);
			this.finish(entry, 'decline', false);
		}
	}

	pendingApprovals(): PendingApprovalView[] {
		return [...this.pending.keys()].map((approvalId) => this.view(approvalId));
	}

	get pendingCount(): number {
		return this.pending.size;
	}

	get records(): readonly ApprovalRecord[] {
		return this.audit;
	}

	get stats(): ApprovalStats {
		return {
			pending: this.pending.size,
			accepted: this.counters.accepted,
			declined: this.counters.declined,
			cancelled: this.counters.cancelled,
			timedOut: this.counters.timedOut,
			maxRoundtripMs: this.counters.maxRoundtripMs,
			avgRoundtripMs:
				this.counters.roundtripCount === 0
					? 0
					: Math.round(this.counters.roundtripTotalMs / this.counters.roundtripCount),
		};
	}

	private expire(approvalId: string): void {
		const entry = this.pending.get(approvalId);
		if (entry === undefined) return;
		this.pending.delete(approvalId);
		this.counters.timedOut += 1;
		this.finish(entry, 'decline', true);
		this.onTimeout?.(this.viewFromEntry(approvalId, entry));
	}

	private finish(entry: PendingEntry, decision: ApprovalDecision, timedOut: boolean): void {
		try {
			entry.registration.respond(decision);
		} catch {
			// The transport may already be closed. The audit record still matters.
		}
		const decidedAtMs = this.now();
		const record: ApprovalRecord = {
			approvalId: entry.registration.approvalId,
			kind: entry.registration.kind,
			threadId: entry.registration.threadId,
			turnId: entry.registration.turnId,
			itemId: entry.registration.itemId,
			decision,
			receivedAtMs: entry.registration.receivedAtMs ?? decidedAtMs,
			decidedAtMs,
			roundtripMs: decidedAtMs - (entry.registration.receivedAtMs ?? decidedAtMs),
			timedOut,
		};
		this.countDecision(decision, record.roundtripMs);
		this.audit.push(record);
		if (this.audit.length > this.maxAuditRecords) this.audit.shift();
		this.onResolved?.(record);
	}

	private countDecision(decision: ApprovalDecision, roundtripMs: number): void {
		if (decision === 'accept' || decision === 'acceptForSession') this.counters.accepted += 1;
		else if (decision === 'cancel') this.counters.cancelled += 1;
		else this.counters.declined += 1;
		this.counters.roundtripTotalMs += roundtripMs;
		this.counters.roundtripCount += 1;
		if (roundtripMs > this.counters.maxRoundtripMs) this.counters.maxRoundtripMs = roundtripMs;
	}

	private view(approvalId: string): PendingApprovalView {
		const entry = this.pending.get(approvalId);
		if (entry === undefined) throw new Error(`approval ${approvalId} is not pending`);
		return this.viewFromEntry(approvalId, entry);
	}

	private viewFromEntry(approvalId: string, entry: PendingEntry): PendingApprovalView {
		return {
			approvalId,
			kind: entry.registration.kind,
			threadId: entry.registration.threadId,
			turnId: entry.registration.turnId,
			itemId: entry.registration.itemId,
			receivedAtMs: entry.registration.receivedAtMs ?? this.now(),
			deadlineAtMs: entry.deadlineAtMs,
		};
	}
}
