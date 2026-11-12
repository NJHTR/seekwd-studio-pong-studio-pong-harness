/**
 * The narrow port between the Agents runtime and the easyCode app-server.
 *
 * `@pong/easycode-runtime` owns the stdio transport, the process lifecycle and
 * the approval broker. This port keeps only the calls of one chat turn, so the
 * agent and its tests do not depend on the concrete supervisor.
 */

/** A notification from the app-server, in the envelope shape of the package. */
import type { DynamicToolSpec } from '@pong/easycode-runtime';

export interface EasycodeNotification {
	method: string;
	params?: unknown;
}

export type EasycodeApprovalKind =
	| 'commandExecution'
	| 'fileChange'
	| 'permissions'
	| 'userInput'
	| 'legacy'
	| 'dynamicTool';

export type EasycodeApprovalDecision = 'accept' | 'acceptForSession' | 'decline' | 'cancel';

/** One approval the app-server waits for. The host answers on the same connection. */
export interface EasycodeApprovalRequest {
	approvalId: string;
	kind: EasycodeApprovalKind;
	threadId: string;
	turnId: string;
	itemId: string;
	command: string | null;
	reason: string | null;
	/** Set for `userInput`: the questions the model asks. */
	questions?: unknown;
}

export interface EasycodePendingApproval {
	approvalId: string;
	kind: EasycodeApprovalKind;
	threadId: string;
	turnId: string;
	itemId: string;
	deadlineAtMs: number;
}

/** A dynamic tool call that easyCode sends to the host. */
export interface EasycodeDynamicToolCall {
	threadId: string;
	turnId: string;
	callId: string;
	tool: string;
	arguments: unknown;
}

export interface EasycodeDynamicToolResult {
	success: boolean;
	text: string;
}

/** Host callbacks for the server-initiated requests of the app-server. */
export interface EasycodeServerHandlers {
	onApprovalRequest?: (request: EasycodeApprovalRequest) => void;
	onDynamicToolCall?: (call: EasycodeDynamicToolCall) => Promise<EasycodeDynamicToolResult>;
}

export interface EasycodeThreadStartParams {
	cwd: string;
	model?: string;
	developerInstructions?: string;
	/** Tool descriptors that the host executes on `item/tool/call`. */
	dynamicTools?: DynamicToolSpec[];
}

export interface EasycodeStartTurnParams {
	model?: string;
	cwd: string;
}

export interface EasycodeInterruptResult {
	status: string;
}

/** One running app-server process, seen from one pong thread. */
export interface EasycodeSupervisorPort {
	start(): Promise<void>;
	startThread(params: EasycodeThreadStartParams): Promise<{ threadId: string }>;
	resumeThread(params: { threadId: string }): Promise<{ threadId: string }>;
	startTurn(
		threadId: string,
		prompt: string,
		params: EasycodeStartTurnParams,
	): Promise<{ turnId: string }>;
	interruptTurn(
		threadId: string,
		turnId: string,
		timeoutMs?: number,
	): Promise<EasycodeInterruptResult>;
	shutdown(): Promise<void>;
	/** Subscribe to app-server notifications. The returned function unsubscribes. */
	onNotification(listener: (notification: EasycodeNotification) => void): () => void;
	/** Answer a pending approval on the same connection. False when it is unknown. */
	decideApproval(approvalId: string, decision: EasycodeApprovalDecision): boolean;
	/** The approvals that still wait for a decision. */
	pendingApprovals(): EasycodePendingApproval[];
	/** The resolved `EASYCODE_HOME` of the child process, for diagnostics. */
	readonly easycodeHome: string;
}

export interface EasycodeSupervisorCreateOptions {
	/** The pong thread id. It keys a per-agent home and the process diagnostics. */
	threadId: string;
	cwd: string;
	/** Test seam: override the binary. Production uses `PONG_EASYCODE_BIN`. */
	exePath?: string;
	/** Test seam: override the app-server arguments. */
	appServerArgs?: string[];
	/** Host callbacks for approvals and dynamic tool calls. */
	handlers?: EasycodeServerHandlers;
}

/** Creates one supervisor for one turn. */
export interface EasycodeSupervisorFactory {
	create(options: EasycodeSupervisorCreateOptions): EasycodeSupervisorPort;
}
