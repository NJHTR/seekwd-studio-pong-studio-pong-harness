import type { StreamChunk } from '@pong/agents';

import type { SystemAgentHostEventEmitter } from '../system-agent-host-events';
import { toJsonValue } from './easycode-json';
import type { EasycodeNotification } from './easycode-supervisor.port';

export interface EasycodeEventProjectionOptions {
	threadId: string;
	emitHostEvent?: SystemAgentHostEventEmitter;
}

interface BlockState {
	text: Set<string>;
	reasoning: Set<string>;
}

const MAX_SEEN_KEYS = 2_000;

/**
 * Projects the easyCode notifications to the pong turn stream.
 *
 * Item deltas become text and reasoning chunks, so the chat timeline renders
 * them. Item lifecycle, plan updates and usage become host events, which the
 * turn stores with its record. Every non-delta notification has a dedupe key:
 * a repeated notification (reconnect, duplicated relay) is projected once.
 *
 * Deltas are not deduped. The app-server sends each delta once over one
 * connection; a reconnect starts a new turn, so a replayed delta would be a
 * new turn's text and not a duplicate.
 */
export class EasycodeEventProjector {
	private readonly seen = new Set<string>();

	private readonly blocks: BlockState = { text: new Set(), reasoning: new Set() };

	constructor(private readonly options: EasycodeEventProjectionOptions) {}

	/** Project one notification. The terminal turn notification is not handled here. */
	project(notification: EasycodeNotification): StreamChunk[] {
		const chunks: StreamChunk[] = [];
		const method = notification.method;
		const params = notification.params;

		if (method === 'error') {
			chunks.push({ type: 'error', error: new Error(readErrorMessage(params)) });
			return chunks;
		}

		if (method === 'item/agentMessage/delta') {
			const itemId = readString(params, 'itemId');
			const delta = readString(params, 'delta');
			if (itemId === undefined || delta === undefined) return chunks;
			if (!this.blocks.text.has(itemId)) {
				this.blocks.text.add(itemId);
				chunks.push({ type: 'text-start', id: itemId });
			}
			chunks.push({ type: 'text-delta', id: itemId, delta });
			return chunks;
		}

		if (method === 'item/reasoning/textDelta' || method === 'item/reasoning/summaryTextDelta') {
			const sourceId = readString(params, 'itemId');
			const delta = readString(params, 'delta');
			if (sourceId === undefined || delta === undefined) return chunks;
			const id = `reasoning:${sourceId}`;
			if (!this.blocks.reasoning.has(id)) {
				this.blocks.reasoning.add(id);
				chunks.push({ type: 'reasoning-start', id });
			}
			chunks.push({ type: 'reasoning-delta', id, delta });
			return chunks;
		}

		if (method === 'item/completed') {
			const item = readField(params, 'item');
			const id = readString(item, 'id');
			const itemType = readString(item, 'type') ?? 'unknown';
			if (id !== undefined && this.blocks.text.has(id)) {
				this.blocks.text.delete(id);
				chunks.push({ type: 'text-end', id });
			}
			if (id !== undefined && this.blocks.reasoning.has(`reasoning:${id}`)) {
				this.blocks.reasoning.delete(`reasoning:${id}`);
				chunks.push({ type: 'reasoning-end', id: `reasoning:${id}` });
			}
			this.hostEvent('easycode-item-completed', `item-completed:${itemType}:${id ?? 'unknown'}`, {
				itemType,
				id,
				status: readString(item, 'status') ?? null,
			});
			if (itemType === 'plan') {
				this.hostEvent('easycode-plan', `plan:${id ?? 'unknown'}`, { id, itemType });
			}
			return chunks;
		}

		if (method === 'item/started') {
			const item = readField(params, 'item');
			const id = readString(item, 'id');
			const itemType = readString(item, 'type') ?? 'unknown';
			this.hostEvent('easycode-item-started', `item-started:${itemType}:${id ?? 'unknown'}`, {
				itemType,
				id,
			});
			return chunks;
		}

		if (method === 'thread/tokenUsage/updated') {
			const usage = mapUsage(params);
			if (usage !== undefined) chunks.push({ type: 'usage', usage, model: 'easycode' });
			return chunks;
		}

		return chunks;
	}

	/** Close the open text and reasoning blocks, for example before the finish chunk. */
	closeOpenBlocks(): StreamChunk[] {
		const chunks: StreamChunk[] = [];
		for (const id of this.blocks.text) chunks.push({ type: 'text-end', id });
		for (const id of this.blocks.reasoning) chunks.push({ type: 'reasoning-end', id });
		this.blocks.text.clear();
		this.blocks.reasoning.clear();
		return chunks;
	}

	private hostEvent(name: string, key: string, payload: Record<string, unknown>): void {
		if (this.options.emitHostEvent === undefined) return;
		if (!this.markSeen(key)) return;
		this.options.emitHostEvent(name, toJsonValue(payload), { key });
	}

	/** True the first time a key is seen. The set is bounded, so a long turn stays small. */
	private markSeen(key: string): boolean {
		if (this.seen.has(key)) return false;
		this.seen.add(key);
		if (this.seen.size > MAX_SEEN_KEYS) {
			const oldest = this.seen.values().next();
			if (!oldest.done) this.seen.delete(oldest.value);
		}
		return true;
	}
}

function readField(source: unknown, key: string): unknown {
	return typeof source === 'object' && source !== null ? Reflect.get(source, key) : undefined;
}

function readString(source: unknown, key: string): string | undefined {
	const value = readField(source, key);
	return typeof value === 'string' ? value : undefined;
}

function readErrorMessage(params: unknown): string {
	const error = readField(params, 'error');
	return readString(error, 'message') ?? 'The easyCode app-server reported an error.';
}

function mapUsage(
	params: unknown,
): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
	const usage = readField(params, 'usage') ?? readField(readField(params, 'tokenUsage'), 'last');
	const input = readNumber(usage, 'inputTokens') ?? readNumber(usage, 'promptTokens');
	const output = readNumber(usage, 'outputTokens') ?? readNumber(usage, 'completionTokens');
	if (input === undefined && output === undefined) return undefined;
	const promptTokens = input ?? 0;
	const completionTokens = output ?? 0;
	return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}

function readNumber(source: unknown, key: string): number | undefined {
	const value = readField(source, key);
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
