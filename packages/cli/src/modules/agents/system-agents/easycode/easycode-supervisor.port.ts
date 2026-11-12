/**
 * The narrow port between the Agents runtime and the easyCode app-server.
 *
 * `@pong/easycode-runtime` owns the stdio transport, the process lifecycle and
 * the approval broker. This port keeps only the calls of one chat turn, so the
 * agent and its tests do not depend on the concrete supervisor.
 */

/** A notification from the app-server, in the envelope shape of the package. */
export interface EasycodeNotification {
	method: string;
	params?: unknown;
}

export interface EasycodeThreadStartParams {
	cwd: string;
	model?: string;
	developerInstructions?: string;
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
}

/** Creates one supervisor for one turn. */
export interface EasycodeSupervisorFactory {
	create(options: EasycodeSupervisorCreateOptions): EasycodeSupervisorPort;
}
