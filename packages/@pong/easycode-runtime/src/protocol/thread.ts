/**
 * Thread lifecycle types.
 * Source: easyCode `app-server-protocol/schema/typescript/v2/{ThreadStartParams,ThreadStartResponse,ThreadResumeParams,ThreadResumeResponse,Thread,ThreadStatus,AskForApproval,SandboxMode,ApprovalsReviewer}.ts`.
 */

import type { DynamicToolSpec } from './dynamic-tools';
import type { JsonValue } from './json';

export type ApprovalPolicy =
	| 'untrusted'
	| 'on-request'
	| 'never'
	| { granular: Record<string, boolean> };

export type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

export type ApprovalsReviewer = 'user' | 'auto_review' | 'guardian_subagent';

export type ThreadStatus =
	| { type: 'notLoaded' }
	| { type: 'idle' }
	| { type: 'systemError' }
	| { type: 'active'; activeFlags: string[] };

export interface Thread {
	id: string;
	sessionId?: string;
	preview?: string;
	ephemeral?: boolean;
	modelProvider?: string;
	status?: ThreadStatus;
}

export interface ThreadStartParams {
	cwd?: string | null;
	model?: string | null;
	modelProvider?: string | null;
	approvalPolicy?: ApprovalPolicy | null;
	approvalsReviewer?: ApprovalsReviewer | null;
	sandbox?: SandboxMode | null;
	baseInstructions?: string | null;
	developerInstructions?: string | null;
	ephemeral?: boolean | null;
	threadSource?: string | null;
	config?: Record<string, JsonValue> | null;
	dynamicTools?: DynamicToolSpec[] | null;
}

export interface ThreadStartResponse {
	thread: Thread;
	model: string;
	modelProvider: string;
	cwd: string;
	approvalPolicy: ApprovalPolicy;
	instructionSources?: string[];
}

export interface ThreadResumeParams {
	threadId: string;
	model?: string | null;
	modelProvider?: string | null;
	cwd?: string | null;
	approvalPolicy?: ApprovalPolicy | null;
	sandbox?: SandboxMode | null;
	baseInstructions?: string | null;
	developerInstructions?: string | null;
	excludeTurns?: boolean;
}

export interface ThreadResumeResponse {
	thread: Thread;
	model: string;
	modelProvider: string;
	cwd?: string;
	approvalPolicy?: ApprovalPolicy;
}
