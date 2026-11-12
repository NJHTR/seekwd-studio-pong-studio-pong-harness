/**
 * Shared types of the easyCode approval host event. They follow the frozen
 * contract in `docs/architecture/m1c-approval-contract.md`, so the frontend can
 * land before the backend endpoint does.
 */

/** The host event name that carries one approval request. */
export const EASYCODE_APPROVAL_HOST_EVENT = 'easycode-approval-requested';

/**
 * The system agent that runs easyCode. The contract endpoint puts the agent id
 * in the path, but the host event payload does not carry it, so the card uses
 * this constant.
 */
export const EASYCODE_SYSTEM_AGENT_ID = 'easycode';

/** The decision values of the contract. */
export const EASYCODE_APPROVAL_DECISION = {
	ACCEPT: 'accept',
	DECLINE: 'decline',
	ACCEPT_FOR_SESSION: 'acceptForSession',
} as const;

export type EasycodeApprovalDecision =
	(typeof EASYCODE_APPROVAL_DECISION)[keyof typeof EASYCODE_APPROVAL_DECISION];

/** The request kinds of the contract, in its spelling. */
export const EASYCODE_APPROVAL_REQUEST_KIND = {
	COMMAND: 'command',
	FILE_CHANGE: 'fileChange',
	PERMISSIONS: 'permissions',
	INPUT: 'input',
} as const;

export type EasycodeApprovalRequestKind =
	(typeof EASYCODE_APPROVAL_REQUEST_KIND)[keyof typeof EASYCODE_APPROVAL_REQUEST_KIND];

/**
 * The card sends answers of an input request keyed by question id. The host
 * event does not always carry that id, so `easycodeApproval.ts` falls back to
 * this positional id for its single question.
 */
export const DEFAULT_EASYCODE_QUESTION_ID = '0';

/** Answers of an input request, keyed by question id. */
export type EasycodeApprovalAnswers = Record<string, string[]>;

/** The body of the decision endpoint. */
export interface EasycodeApprovalDecisionBody {
	decision: EasycodeApprovalDecision;
	answers?: EasycodeApprovalAnswers;
}

/** The 200 response of the decision endpoint. */
export interface EasycodeApprovalDecisionResponse {
	ok: boolean;
}

/** One validated `easycode-approval-requested` payload. */
export interface EasycodeApprovalPayload {
	approvalId: string;
	threadId: string;
	turnId?: string;
	itemId?: string;
	requestKind: EasycodeApprovalRequestKind;
	title?: string;
	detail?: string;
	command?: string;
	cwd?: string;
	reason?: string;
	/** Decisions that the backend allows for this request. Never empty. */
	availableDecisions: readonly EasycodeApprovalDecision[];
	/** Epoch milliseconds. Absent or `0` means the card shows no countdown. */
	expiresAtMs?: number;
	question?: string;
	options?: readonly string[];
	/**
	 * The question id of an input request. The frozen contract does not list
	 * this field; the parser reads it when a backend sends it anyway.
	 */
	questionId?: string;
}
