import type { ApprovalHostRequest } from '@pong/easycode-runtime';

import type { SystemAgentHostEventEmitter } from '../system-agent-host-events';
import { toJsonValue } from './easycode-json';
import { EASYCODE_APPROVAL_TIMEOUT_MS } from './easycode.constants';
import type {
	EasycodeApprovalDecision,
	EasycodeApprovalKind,
	EasycodeApprovalRequest,
	EasycodePendingApproval,
} from './easycode-supervisor.port';

/** The session grants of the thread (`agent_thread_grants`), seen as a small port. */
export interface EasycodeApprovalGrantPort {
	load(): Promise<ReadonlySet<string>>;
	grant(key: string): Promise<void>;
}

export interface EasycodeApprovalAuditEntry {
	approvalId: string;
	kind: EasycodeApprovalKind;
	threadId: string;
	turnId: string;
	itemId: string;
	decision: EasycodeApprovalDecision;
	receivedAtMs: number;
	decidedAtMs: number;
	roundtripMs: number;
	timedOut: boolean;
}

export interface EasycodeApprovalBridgeOptions {
	threadId: string;
	/** Host events carry the approval card to the chat stream and to history. */
	emit: SystemAgentHostEventEmitter;
	grants: EasycodeApprovalGrantPort;
	/** Answers the pending approval on the app-server connection. */
	decide: (approvalId: string, decision: EasycodeApprovalDecision) => boolean;
	timeoutMs?: number;
	now?: () => number;
}

interface PendingEntry {
	request: EasycodeApprovalRequest;
	grantKey: string;
	receivedAtMs: number;
	deadlineAtMs: number;
	timer: NodeJS.Timeout;
}

/**
 * Maps easyCode approvals to the pong approval semantics.
 *
 * One approval becomes one host event (`easycode-approval`) with a stable key,
 * so the chat records it in the existing turn and history. The decision goes
 * back on the same connection. A session grant answers later approvals of the
 * same target without a card. A request that nobody answers before the deadline
 * is declined and audited, because the app-server blocks the turn while it
 * waits.
 *
 * The bridge is idempotent per `(threadId, turnId, itemId, approvalId)`: a
 * repeated request reuses the earlier decision and never opens a second card.
 */
export class EasycodeApprovalBridge {
	private readonly pending = new Map<string, PendingEntry>();

	private readonly decided = new Map<string, EasycodeApprovalDecision>();

	/** Resolvers of the callers that wait for one decision (dynamic tools). */
	private readonly waiters = new Map<string, (decision: EasycodeApprovalDecision) => void>();

	private readonly audits: EasycodeApprovalAuditEntry[] = [];

	private approvedKeys: ReadonlySet<string> = new Set();

	private readonly timeoutMs: number;

	private readonly now: () => number;

	constructor(private readonly options: EasycodeApprovalBridgeOptions) {
		this.timeoutMs = options.timeoutMs ?? EASYCODE_APPROVAL_TIMEOUT_MS;
		this.now = options.now ?? (() => Date.now());
	}

	async loadGrants(): Promise<void> {
		this.approvedKeys = new Set(await this.options.grants.load());
	}

	/** The dedupe and merge key of one request. */
	static keyOf(
		request: Pick<EasycodeApprovalRequest, 'threadId' | 'turnId' | 'itemId' | 'approvalId'>,
	): string {
		return `${request.threadId}:${request.turnId}:${request.itemId}:${request.approvalId}`;
	}

	/** Request an approval and wait for its decision. Used by the dynamic tools. */
	async ask(request: EasycodeApprovalRequest): Promise<EasycodeApprovalDecision> {
		const key = EasycodeApprovalBridge.keyOf(request);
		const earlier = this.decided.get(key);
		if (earlier !== undefined) return earlier;
		return await new Promise<EasycodeApprovalDecision>((resolve) => {
			this.waiters.set(key, resolve);
			this.request(request);
		});
	}

	/**
	 * Handle one server approval request. The bridge answers through `decide`
	 * when the user decides or the deadline expires; it never keeps a second
	 * outstanding response for the same request.
	 */
	request(request: EasycodeApprovalRequest): void {
		const key = EasycodeApprovalBridge.keyOf(request);
		const earlier = this.decided.get(key);
		if (earlier !== undefined) {
			this.options.decide(request.approvalId, earlier);
			return;
		}
		if (this.pending.has(key)) return;

		const grantKey = this.grantKeyOf(request);
		if (this.approvedKeys.has(grantKey)) {
			this.settle(key, request, grantKey, 'accept', false, this.now());
			return;
		}

		const receivedAtMs = this.now();
		const entry: PendingEntry = {
			request,
			grantKey,
			receivedAtMs,
			deadlineAtMs: receivedAtMs + this.timeoutMs,
			timer: setTimeout(() => undefined, this.timeoutMs),
		};
		clearTimeout(entry.timer);
		entry.timer = setTimeout(() => {
			// The app-server blocks the turn, so an unanswered request must end.
			this.settle(key, request, grantKey, 'decline', true, receivedAtMs);
		}, this.timeoutMs);
		entry.timer.unref();
		this.pending.set(key, entry);
		this.options.emit(
			'easycode-approval',
			toJsonValue({
				approvalId: request.approvalId,
				kind: request.kind,
				itemId: request.itemId,
				turnId: request.turnId,
				command: request.command,
				reason: request.reason,
				deadlineAtMs: entry.deadlineAtMs,
				...(request.questions !== undefined ? { questions: request.questions } : {}),
			}),
			{ key: `approval:${request.approvalId}` },
		);
	}

	/** Decide one pending approval. False when the id is unknown or already decided. */
	resolve(approvalId: string, decision: EasycodeApprovalDecision): boolean {
		const found = [...this.pending.entries()].find(
			([, entry]) => entry.request.approvalId === approvalId,
		);
		if (found === undefined) return false;
		const [key, entry] = found;
		this.settle(key, entry.request, entry.grantKey, decision, false, entry.receivedAtMs);
		return true;
	}

	/** Decide every approval of one turn. Returns how many were pending. */
	resolveTurn(turnId: string, decision: EasycodeApprovalDecision): number {
		const entries = [...this.pending.entries()].filter(
			([, entry]) => entry.request.turnId === turnId,
		);
		for (const [key, entry] of entries) {
			this.settle(key, entry.request, entry.grantKey, decision, false, entry.receivedAtMs);
		}
		return entries.length;
	}

	/** The turn was interrupted: decline its approvals and stop their timers. */
	cancelTurn(turnId: string): number {
		return this.resolveTurn(turnId, 'cancel');
	}

	pendingList(): EasycodePendingApproval[] {
		return [...this.pending.values()].map((entry) => ({
			approvalId: entry.request.approvalId,
			kind: entry.request.kind,
			threadId: entry.request.threadId,
			turnId: entry.request.turnId,
			itemId: entry.request.itemId,
			deadlineAtMs: entry.deadlineAtMs,
		}));
	}

	get pendingCount(): number {
		return this.pending.size;
	}

	get audit(): readonly EasycodeApprovalAuditEntry[] {
		return this.audits;
	}

	/** The session grant key of one target, so earlier decisions can skip the card. */
	grantKeyOf(request: EasycodeApprovalRequest): string {
		const target =
			request.command ??
			readQuestionTarget(request.questions) ??
			(request.kind === 'fileChange' ? 'file-change' : request.itemId);
		return `easycode:${request.kind}:${target}`;
	}

	private settle(
		key: string,
		request: EasycodeApprovalRequest,
		grantKey: string,
		decision: EasycodeApprovalDecision,
		timedOut: boolean,
		receivedAtMs: number,
	): void {
		const entry = this.pending.get(key);
		if (entry !== undefined) {
			clearTimeout(entry.timer);
			this.pending.delete(key);
		}
		if (this.decided.has(key)) return;

		this.decided.set(key, decision);
		const waiter = this.waiters.get(key);
		if (waiter !== undefined) {
			this.waiters.delete(key);
			waiter(decision);
		}
		const decidedAtMs = this.now();
		this.audits.push({
			approvalId: request.approvalId,
			kind: request.kind,
			threadId: request.threadId,
			turnId: request.turnId,
			itemId: request.itemId,
			decision,
			receivedAtMs,
			decidedAtMs,
			roundtripMs: Math.max(0, decidedAtMs - receivedAtMs),
			timedOut,
		});
		this.options.emit(
			'easycode-approval-decided',
			toJsonValue({
				approvalId: request.approvalId,
				kind: request.kind,
				decision,
				timedOut,
			}),
			{ key: `approval-decided:${request.approvalId}` },
		);
		if (!timedOut && (decision === 'accept' || decision === 'acceptForSession')) {
			if (decision === 'acceptForSession') void this.options.grants.grant(grantKey);
			this.approvedKeys = new Set([...this.approvedKeys, grantKey]);
		}
		// Answer on the same connection. The turn never suspends on this path.
		this.options.decide(request.approvalId, decision);
	}
}

function readQuestionTarget(questions: unknown): string | undefined {
	if (!Array.isArray(questions) || questions.length === 0) return undefined;
	const first: unknown = questions[0];
	if (typeof first !== 'object' || first === null) return undefined;
	const header = Reflect.get(first, 'header');
	return typeof header === 'string' ? header : undefined;
}

/** Map the package approval callback to the bridge request. */
export function toApprovalRequest(host: ApprovalHostRequest): EasycodeApprovalRequest {
	return {
		approvalId: host.approvalId,
		kind: toKind(host.kind),
		threadId: host.threadId,
		turnId: host.turnId,
		itemId: host.itemId,
		command: host.command,
		reason: host.reason,
	};
}

function toKind(kind: string): EasycodeApprovalKind {
	if (kind === 'commandExecution' || kind === 'fileChange' || kind === 'permissions') return kind;
	if (kind === 'userInput') return 'userInput';
	return 'legacy';
}
