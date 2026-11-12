/**
 * Approval and other server-initiated request payloads.
 * Source: easyCode `app-server-protocol/schema/typescript/v2/{CommandExecutionRequestApproval*,FileChangeRequestApproval*,PermissionsRequestApproval*,ToolRequestUserInput*,McpServerElicitation*}.ts` and the v1 `{ApplyPatchApproval*,ExecCommandApproval*}` files.
 */

export type CommandExecutionApprovalDecision =
	| 'accept'
	| 'acceptForSession'
	| { acceptWithExecpolicyAmendment: Record<string, unknown> }
	| 'decline'
	| 'cancel';

export interface CommandExecutionApprovalParams {
	kind?: 'command' | 'writeStdin';
	threadId: string;
	turnId: string;
	itemId: string;
	startedAtMs?: number;
	/** Present only for write-stdin or zsh-bridge callbacks. */
	approvalId?: string | null;
	environmentId?: string | null;
	reason?: string | null;
	command?: string | null;
	cwd?: string | null;
}

export interface CommandExecutionApprovalResponse {
	decision: CommandExecutionApprovalDecision;
}

export type FileChangeApprovalDecision = 'accept' | 'acceptForSession' | 'decline' | 'cancel';

export interface FileChangeApprovalParams {
	threadId: string;
	turnId: string;
	itemId: string;
	startedAtMs?: number;
	reason?: string | null;
	grantRoot?: string | null;
}

export interface FileChangeApprovalResponse {
	decision: FileChangeApprovalDecision;
}

export interface PermissionsApprovalParams {
	threadId: string;
	turnId: string;
	itemId: string;
	environmentId?: string | null;
	startedAtMs?: number;
	reason?: string | null;
	permissions: unknown;
}

export interface PermissionsApprovalResponse {
	permissions: unknown;
	scope: 'turn' | 'session';
}

export interface ToolUserInputQuestion {
	id: string;
	header: string;
	question: string;
	isOther?: boolean;
	isSecret?: boolean;
	options?: Array<{ label: string; description?: string }> | null;
}

export interface ToolRequestUserInputParams {
	threadId: string;
	turnId: string;
	itemId: string;
	questions: ToolUserInputQuestion[];
	isBlocking?: boolean;
}

export interface ToolRequestUserInputResponse {
	answers: Record<string, { answers: string[] } | undefined>;
}

export interface McpElicitationRequestParams {
	threadId: string;
	turnId?: string | null;
	serverName: string;
	mode?: string;
	message?: string;
}

export interface McpElicitationRequestResponse {
	action: 'accept' | 'decline' | 'cancel';
	content: unknown;
	_meta: unknown;
}

/** Legacy v1 approval request. The app-server may still send it. */
export interface LegacyApprovalParams {
	conversationId: string;
	callId?: string;
	approvalId?: string | null;
	command?: string[];
	cwd?: string;
	reason?: string | null;
}

export interface LegacyApprovalResponse {
	decision: 'approved' | 'approved_for_session' | 'abort' | { denied: { rejection: string } };
}
