/**
 * Turn types and turn/item notifications.
 * Source: easyCode `app-server-protocol/schema/typescript/v2/{Turn,TurnStatus,TurnError,TurnStartParams,TurnStartResponse,TurnInterruptParams,TurnInterruptResponse,Turn*Notification,Item*Notification,ErrorNotification}.ts`.
 */

export type TurnStatus = 'completed' | 'interrupted' | 'failed' | 'inProgress';

export interface TurnError {
	message: string;
	codexErrorInfo?: unknown;
	additionalDetails?: string | null;
}

/** Fields of `ThreadItem` that pong consumes in M0. */
export interface ThreadItemSummary {
	type: string;
	id: string;
	text?: string;
	command?: string;
	status?: string;
	exitCode?: number | null;
	durationMs?: number | null;
}

export interface Turn {
	id: string;
	status: TurnStatus;
	items?: ThreadItemSummary[];
	error?: TurnError | null;
	durationMs?: number | null;
}

export interface TextElement {
	start: number;
	end: number;
}

export type UserInput =
	| { type: 'text'; text: string; text_elements?: TextElement[] }
	| { type: 'localImage'; path: string }
	| { type: 'image'; url: string };

export type SandboxPolicy =
	| { type: 'dangerFullAccess' }
	| { type: 'readOnly'; networkAccess: boolean }
	| {
			type: 'workspaceWrite';
			writableRoots: string[];
			networkAccess: 'restricted' | 'enabled';
			excludeTmpdirEnvVar: boolean;
			excludeSlashTmp: boolean;
	  };

export interface TurnStartParams {
	threadId: string;
	input: UserInput[];
	cwd?: string | null;
	model?: string | null;
	approvalPolicy?: string | null;
	sandboxPolicy?: SandboxPolicy | null;
	clientUserMessageId?: string | null;
}

export interface TurnStartResponse {
	turn: Turn;
}

export interface TurnInterruptParams {
	threadId: string;
	turnId: string;
}

/** The server answers `turn/interrupt` with an empty object. */
export type TurnInterruptResponse = Record<string, never>;

export interface TurnStartedNotification {
	threadId: string;
	turn: Turn;
}

export interface TurnCompletedNotification {
	threadId: string;
	turn: Turn;
}

export interface ItemStartedNotification {
	threadId: string;
	turnId: string;
	item: ThreadItemSummary;
	startedAtMs?: number;
}

export interface ItemCompletedNotification {
	threadId: string;
	turnId: string;
	item: ThreadItemSummary;
	completedAtMs?: number;
}

export interface AgentMessageDeltaNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	delta: string;
}

export interface ErrorNotification {
	threadId: string;
	turnId: string;
	error: TurnError;
	willRetry: boolean;
}
