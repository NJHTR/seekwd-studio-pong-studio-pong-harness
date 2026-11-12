import type { JSONValue } from '@pong/agents';
import type { ApprovalHostRequest } from '@pong/easycode-runtime';

import type { SystemAgentHostEventEmitter } from '../system-agent-host-events';
import { EASYCODE_APPROVAL_TIMEOUT_MS } from './easycode.constants';
import { toJsonValue } from './easycode-json';
import type {
	EasycodeApprovalDecision,
	EasycodeApprovalKind,
	EasycodeApprovalRequest,
	EasycodePendingApproval,
} from './easycode-supervisor.port';

/** Answers of an input request, keyed by question id (M1-C contract). */
export type EasycodeApprovalAnswers = Record<string, string[]>;

/** The decision result of the endpoint: 200, 404 or 409 of the contract. */
export type EasycodeResolveOutcome =
	| { status: 'ok' }
	| { status: 'unknown' }
	| { status: 'decided' }
	| { status: 'expired' };

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
	/** Answers a command / file / permissions approval on the app-server connection. */
	decide?: (approvalId: string, decision: EasycodeApprovalDecision) => boolean;
	/** Sends the collected answers of an input request on the app-server connection. */
	answerUserInput?: (approvalId: string, answers: Record<string, { answers: string[] }>) => boolean;
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

const REQUEST_KIND: Record<EasycodeApprovalKind, string> = {
	commandExecution: 'command',
	fileChange: 'fileChange',
	permissions: 'permissions',
	userInput: 'input',
	legacy: 'command',
	dynamicTool: 'command',
};

const TITLE: Record<EasycodeApprovalKind, string> = {
	commandExecution: 'Run a command',
	fileChange: 'Change files',
	permissions: 'Grant permissions',
	userInput: 'Answer a question',
	legacy: 'Run a command',
	dynamicTool: 'Run a pong tool',
};

const AVAILABLE_DECISIONS = ['accept', 'decline', 'acceptForSession'];

/**
 * Maps easyCode approvals to the pong approval semantics and the frozen M1-C
 * contract.
 *
 * One approval becomes one host event (`easycode-approval-requested`) with a
 * stable key, so the chat records it in the existing turn and in history. The
 * decision goes back on the same connection. A session grant answers later
 * approvals of the same target without a card. A request that nobody answers
 * before the deadline is declined and audited, because the app-server blocks
 * the turn while it waits.
 *
 * The bridge is idempotent per `(threadId, turnId, itemId, approvalId)`: a
 * repeated request reuses the earlier decision and never opens a second card.
 */
export class EasycodeApprovalBridge {
	private readonly pending = new Map<string, PendingEntry>();

	/** Outcome per dedupe key, so the endpoint can answer 409 with the state. */
	private readonly outcomes = new Map<
		string,
		{ decision: EasycodeApprovalDecision; expired: boolean }
	>();

	private readonly audits: EasycodeApprovalAuditEntry[] = [];

	/** Resolvers of the callers that wait for one decision (dynamic tools). */
	private readonly waiters = new Map<string, (decision: EasycodeApprovalDecision) => void>();

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

	/**
	 * Handle one server approval request. The bridge answers through `decide`
	 * when the user decides or the deadline expires; it never keeps a second
	 * outstanding response for the same request.
	 */
	request(request: EasycodeApprovalRequest): void {
		const key = EasycodeApprovalBridge.keyOf(request);
		const earlier = this.outcomes.get(key);
		if (earlier !== undefined) {
			this.answerIncoming(request, earlier.decision, undefined);
			return;
		}
		if (this.pending.has(key)) return;

		const grantKey = this.grantKeyOf(request);
		if (this.approvedKeys.has(grantKey)) {
			this.settle(key, request, grantKey, 'accept', false, this.now(), undefined);
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
			this.settle(key, request, grantKey, 'decline', true, receivedAtMs, undefined);
		}, this.timeoutMs);
		entry.timer.unref();
		this.pending.set(key, entry);
		this.options.emit('easycode-approval-requested', this.toPayload(request, entry.deadlineAtMs), {
			key: `approval:${request.approvalId}`,
		});
	}

	/**
	 * Answer a pending approval (M1-C endpoint path). Idempotent: a second call
	 * returns the decided or expired state instead of changing the outcome.
	 */
	resolve(
		approvalId: string,
		decision: EasycodeApprovalDecision,
		answers?: EasycodeApprovalAnswers,
	): EasycodeResolveOutcome {
		const found = [...this.pending.entries()].find(
			([, entry]) => entry.request.approvalId === approvalId,
		);
		if (found === undefined) {
			const outcome = [...this.outcomes.entries()].find(([key]) => key.endsWith(`:${approvalId}`));
			if (outcome === undefined) return { status: 'unknown' };
			return { status: outcome[1].expired ? 'expired' : 'decided' };
		}
		const [key, entry] = found;
		this.settle(key, entry.request, entry.grantKey, decision, false, entry.receivedAtMs, answers);
		return { status: 'ok' };
	}

	/** Request an approval and wait for its decision. Used by the dynamic tools. */
	async ask(request: EasycodeApprovalRequest): Promise<EasycodeApprovalDecision> {
		const key = EasycodeApprovalBridge.keyOf(request);
		const outcome = this.outcomes.get(key);
		if (outcome !== undefined) return outcome.decision;
		return await new Promise<EasycodeApprovalDecision>((resolve) => {
			this.waiters.set(key, resolve);
			this.request(request);
		});
	}

	/** True while the approval waits for a decision. */
	has(approvalId: string): boolean {
		return [...this.pending.values()].some((entry) => entry.request.approvalId === approvalId);
	}

	/** Decide every approval of one turn. Returns how many were pending. */
	resolveTurn(turnId: string, decision: EasycodeApprovalDecision): number {
		const entries = [...this.pending.entries()].filter(
			([, entry]) => entry.request.turnId === turnId,
		);
		for (const [key, entry] of entries) {
			this.settle(
				key,
				entry.request,
				entry.grantKey,
				decision,
				false,
				entry.receivedAtMs,
				undefined,
			);
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
		answers: EasycodeApprovalAnswers | undefined,
	): void {
		const entry = this.pending.get(key);
		if (entry !== undefined) {
			clearTimeout(entry.timer);
			this.pending.delete(key);
		}
		if (this.outcomes.has(key)) return;
		this.outcomes.set(key, { decision, expired: timedOut });
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
		this.answerIncoming(request, decision, answers);
	}

	private answerIncoming(
		request: EasycodeApprovalRequest,
		decision: EasycodeApprovalDecision,
		answers: EasycodeApprovalAnswers | undefined,
	): void {
		if (request.kind === 'userInput' && answers !== undefined && this.options.answerUserInput) {
			const mapped: Record<string, { answers: string[] }> = {};
			for (const [questionId, value] of Object.entries(answers)) {
				mapped[questionId] = { answers: value };
			}
			this.options.answerUserInput(request.approvalId, mapped);
			return;
		}
		this.options.decide?.(request.approvalId, decision);
	}

	private toPayload(request: EasycodeApprovalRequest, deadlineAtMs: number): JSONValue {
		const input = readQuestion(request.questions);
		return toJsonValue({
			approvalId: request.approvalId,
			threadId: request.threadId,
			turnId: request.turnId,
			itemId: request.itemId,
			requestKind: REQUEST_KIND[request.kind],
			title: TITLE[request.kind],
			detail: request.reason,
			command: request.command,
			reason: request.reason,
			availableDecisions: AVAILABLE_DECISIONS,
			expiresAtMs: deadlineAtMs,
			...(input?.question !== undefined ? { question: input.question } : {}),
			...(input?.options !== undefined ? { options: input.options } : {}),
		});
	}
}

function readQuestion(questions: unknown): { question: string; options: string[] } | undefined {
	if (!Array.isArray(questions) || questions.length === 0) return undefined;
	const first: unknown = questions[0];
	if (typeof first !== 'object' || first === null) return undefined;
	const header = Reflect.get(first, 'header');
	const question = Reflect.get(first, 'question');
	const options = Reflect.get(first, 'options');
	const labels = Array.isArray(options)
		? options
				.map((option) =>
					typeof option === 'object' && option !== null ? Reflect.get(option, 'label') : undefined,
				)
				.filter((label): label is string => typeof label === 'string')
		: [];
	return {
		question: typeof question === 'string' ? question : typeof header === 'string' ? header : '',
		options: labels,
	};
}

function readQuestionTarget(questions: unknown): string | undefined {
	return readQuestion(questions)?.question;
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
