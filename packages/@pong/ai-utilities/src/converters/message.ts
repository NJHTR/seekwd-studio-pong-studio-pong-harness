import * as LangchainMessages from '@langchain/core/messages';
import { jsonParse } from 'pong-workflow';

import type * as PongMessages from '../types/message';
import type { Message } from '../types/message';

function isPongTextBlock(block: PongMessages.MessageContent): block is PongMessages.ContentText {
	return block.type === 'text';
}
function isPongReasoningBlock(
	block: PongMessages.MessageContent,
): block is PongMessages.ContentReasoning {
	return block.type === 'reasoning';
}
function isPongFileBlock(block: PongMessages.MessageContent): block is PongMessages.ContentFile {
	return block.type === 'file';
}
function isPongToolCallBlock(
	block: PongMessages.MessageContent,
): block is PongMessages.ContentToolCall {
	return block.type === 'tool-call';
}
function isPongInvalidToolCallBlock(
	block: PongMessages.MessageContent,
): block is PongMessages.ContentInvalidToolCall {
	return block.type === 'invalid-tool-call';
}
function isPongToolResultBlock(
	block: PongMessages.MessageContent,
): block is PongMessages.ContentToolResult {
	return block.type === 'tool-result';
}
function isPongCitationBlock(
	block: PongMessages.MessageContent,
): block is PongMessages.ContentCitation {
	return block.type === 'citation';
}
function isPongProviderBlock(
	block: PongMessages.MessageContent,
): block is PongMessages.ContentProvider {
	return block.type === 'provider';
}

function fromLcRole(role: LangchainMessages.MessageType): PongMessages.MessageRole {
	switch (role) {
		case 'system':
			return 'system';
		case 'user':
			return 'user';
		case 'assistant':
			return 'assistant';
		case 'tool':
			return 'tool';
		default:
			return 'user';
	}
}
function isTextBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Text {
	return block.type === 'text';
}
function isReasoningBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Reasoning {
	return block.type === 'reasoning';
}
function isFileBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Multimodal.Standard {
	return (
		block.type === 'file' ||
		block.type === 'audio' ||
		block.type === 'video' ||
		block.type === 'image' ||
		block.type === 'text-plain'
	);
}
function isToolCallBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Tools.ToolCall {
	return block.type === 'tool_call';
}
function isInvalidToolCallBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Tools.InvalidToolCall {
	return block.type === 'invalid_tool_call';
}
function isToolResultBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Tools.ServerToolCallResult {
	return block.type === 'server_tool_call_result';
}
function isCitationBlock(block: unknown): block is LangchainMessages.ContentBlock.Citation {
	return (
		typeof block === 'object' && block !== null && 'type' in block && block.type === 'citation'
	);
}
function isNonStandardBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.NonStandard {
	return block.type === 'non_standard';
}

export function fromLcContent(
	content: string | LangchainMessages.ContentBlock | LangchainMessages.ContentBlock[],
): PongMessages.MessageContent[] {
	if (typeof content === 'string') {
		return [
			{
				type: 'text',
				text: content,
			},
		];
	}
	const blocks = Array.isArray(content) ? content : [content];
	return blocks
		.map((block) => {
			let content: PongMessages.MessageContent | null = null;

			if (isTextBlock(block)) {
				content = {
					type: 'text',
					text: block.text,
				};
			} else if (isReasoningBlock(block)) {
				content = {
					type: 'reasoning',
					text: block.reasoning,
				};
			} else if (isFileBlock(block)) {
				let metadata: Record<string, unknown> = {};
				if (block.metadata) {
					metadata = block.metadata;
				}
				if ('url' in block) {
					metadata.url = block.url;
				}
				if ('fileId' in block) {
					metadata.fileId = block.fileId;
				}
				content = {
					type: 'file',
					mediaType: block.mimeType!,
					data: block.data!,
					providerMetadata: Object.keys(metadata).length > 0 ? metadata : undefined,
				};
			} else if (isToolCallBlock(block)) {
				content = {
					type: 'tool-call',
					toolCallId: block.id,
					toolName: block.name,
					input: JSON.stringify(block.args),
				};
			} else if (isInvalidToolCallBlock(block)) {
				content = {
					type: 'invalid-tool-call',
					toolCallId: block.id,
					error: block.error,
					args: block.args,
					name: block.name,
				};
			} else if (isToolResultBlock(block)) {
				content = {
					type: 'tool-result',
					toolCallId: block.toolCallId,
					result: block.output,
					isError: block.status === 'error',
				};
			} else if (isCitationBlock(block)) {
				content = {
					type: 'citation',
					source: block.source,
					url: block.url,
					title: block.title,
					startIndex: block.startIndex,
					endIndex: block.endIndex,
					text: block.citedText,
				};
			} else if (isNonStandardBlock(block)) {
				content = {
					type: 'provider',
					value: block.value,
				};
			}
			return content;
		})
		.filter((content): content is PongMessages.MessageContent => content !== null);
}

export function fromLcMessage(msg: LangchainMessages.BaseMessage): PongMessages.Message {
	if (LangchainMessages.ToolMessage.isInstance(msg)) {
		const result = typeof msg.content === 'string' ? msg.content : fromLcContent(msg.content);
		return {
			role: 'tool',
			content: [
				{
					type: 'tool-result',
					toolCallId: msg.tool_call_id,
					result,
					isError: msg.status === 'error',
					providerMetadata: msg.metadata,
				},
			],
			id: msg.id,
			name: msg.name,
		};
	}
	if (LangchainMessages.AIMessage.isInstance(msg)) {
		const content = fromLcContent(msg.content);
		const toolsCalls = msg.tool_calls;
		if (toolsCalls?.length) {
			const mappedToolsCalls = toolsCalls.map<PongMessages.ContentToolCall>((toolCall) => ({
				type: 'tool-call',
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				input: JSON.stringify(toolCall.args),
				providerMetadata: msg.response_metadata,
			}));
			content.push(...mappedToolsCalls);
		}
		return {
			role: 'assistant',
			content,
			id: msg.id,
			name: msg.name,
		};
	}
	if (LangchainMessages.SystemMessage.isInstance(msg)) {
		return {
			role: 'system',
			content: fromLcContent(msg.content),
			id: msg.id,
			name: msg.name,
		};
	}
	if (LangchainMessages.HumanMessage.isInstance(msg)) {
		return {
			role: 'user',
			content: fromLcContent(msg.content),
			id: msg.id,
			name: msg.name,
		};
	}
	if (LangchainMessages.BaseMessage.isInstance(msg)) {
		return {
			role: fromLcRole(msg.type),
			content: fromLcContent(msg.content),
			id: msg.id,
			name: msg.name,
		};
	}
	throw new Error(`Provided message is not a valid Langchain message: ${JSON.stringify(msg)}`);
}

export function toLcContent(block: PongMessages.MessageContent): LangchainMessages.ContentBlock {
	if (isPongTextBlock(block)) {
		return { type: 'text', text: block.text };
	}
	if (isPongReasoningBlock(block)) {
		return { type: 'reasoning', reasoning: block.text };
	}
	if (isPongFileBlock(block)) {
		const { url, fileId, ...rest } = block.providerMetadata ?? {};
		return {
			type: 'file',
			mimeType: block.mediaType ?? 'application/octet-stream',
			data: block.data,
			...(url ? { url } : {}),
			...(fileId ? { fileId } : {}),
			...(Object.keys(rest).length > 0 ? { metadata: rest } : {}),
		};
	}
	if (isPongToolCallBlock(block)) {
		return {
			type: 'tool_call',
			id: block.toolCallId,
			name: block.toolName,
			args: jsonParse<Record<string, unknown>>(block.input, { fallbackValue: {} }),
		};
	}
	if (isPongInvalidToolCallBlock(block)) {
		return {
			type: 'invalid_tool_call',
			id: block.toolCallId,
			error: block.error,
			args: block.args,
			name: block.name,
		};
	}
	if (isPongToolResultBlock(block)) {
		return {
			type: 'server_tool_call_result',
			toolCallId: block.toolCallId,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			output: block.result,
			status: block.isError ? 'error' : 'success',
		};
	}
	if (isPongCitationBlock(block)) {
		return {
			type: 'citation',
			source: block.source,
			url: block.url,
			title: block.title,
			startIndex: block.startIndex,
			endIndex: block.endIndex,
			citedText: block.text,
		};
	}
	if (isPongProviderBlock(block)) {
		return {
			type: 'non_standard',
			value: block.value,
		};
	}
	throw new Error(`Failed to convert to Langchain content block: ${JSON.stringify(block)}`);
}

export function toLcMessage(message: Message): LangchainMessages.BaseMessage {
	const lcContent = message.content.map(toLcContent);

	switch (message.role) {
		case 'system':
			return new LangchainMessages.SystemMessage({
				content: lcContent,
				id: message.id,
				name: message.name,
			});
		case 'user':
			return new LangchainMessages.HumanMessage({
				content: lcContent,
				id: message.id,
				name: message.name,
			});
		case 'assistant': {
			const toolCalls: LangchainMessages.ToolCall[] = message.content
				.filter(isPongToolCallBlock)
				.map((c) => ({
					type: 'tool_call',
					id: c.toolCallId,
					name: c.toolName,
					args: jsonParse<Record<string, unknown>>(c.input, { fallbackValue: {} }),
				}));
			const nonToolContent = lcContent.filter((c) => c.type !== 'tool_call');
			return new LangchainMessages.AIMessage({
				content: nonToolContent,
				id: message.id,
				name: message.name,
				tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
			});
		}
		case 'tool': {
			const toolResult = message.content.find(isPongToolResultBlock);
			if (!toolResult) {
				throw new Error('Tool message is missing a tool-result content block');
			}
			const content =
				typeof toolResult.result === 'string'
					? toolResult.result
					: JSON.stringify(toolResult.result);
			return new LangchainMessages.ToolMessage({
				content,
				tool_call_id: toolResult.toolCallId,
				name: message.name,
				status: toolResult.isError ? 'error' : 'success',
			});
		}
		default:
			return new LangchainMessages.HumanMessage({
				content: lcContent,
				id: message.id,
				name: message.name,
			});
	}
}
