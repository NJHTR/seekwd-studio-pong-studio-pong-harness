import { hashFileContent } from '../../agent-chat-attachment.service';
import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { EasycodeArtifactSink } from './artifact-bridge';

export interface EasycodeAttachmentSinkScope {
	agentId: string;
	projectId: string;
	threadId: string;
	resourceId?: string;
}

/**
 * Stores an easyCode patch as an agent file.
 *
 * The bytes go through `AgentChatAttachmentService.storeInbound`, so they live
 * in `BinaryDataService` and the metadata row lives in
 * `agent_chat_attachments` (project + thread scope, retention, caps). The
 * manifest carries the row id, the thread and the turn that produced it, so
 * history can find the diff again.
 */
export class EasycodeAttachmentArtifactSink implements EasycodeArtifactSink {
	constructor(
		private readonly attachments: AgentChatAttachmentService,
		private readonly scope: EasycodeAttachmentSinkScope,
	) {}

	async store(input: {
		bytes: Buffer;
		fileName: string;
		mimeType: string;
	}): Promise<{ fileId: string }> {
		const attachment = await this.attachments.storeInbound({
			agentId: this.scope.agentId,
			projectId: this.scope.projectId,
			threadId: this.scope.threadId,
			...(this.scope.resourceId !== undefined ? { resourceId: this.scope.resourceId } : {}),
			source: 'tool',
			fileName: input.fileName,
			mimeType: input.mimeType,
			data: input.bytes,
			contentHash: hashFileContent(input.bytes),
		});
		return { fileId: attachment.id };
	}
}
