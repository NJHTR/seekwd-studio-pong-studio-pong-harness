import type { AgentMessageIntegrationOrigin } from '@pong/api-types';
import { isRecord } from '@pong/utils/is-record';

import {
	fetchChannelName,
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
	type OriginNames,
} from '../../integration-origin-support';

export function buildSlackOriginDraft(
	{ message }: OriginInput,
	decoded: DecodedThread,
): OriginDraft {
	const raw = isRecord(message.raw) ? message.raw : {};
	const conversationKind = slackConversationKind(raw);
	return {
		type: 'slack',
		workspaceId: typeof raw.pongWorkspaceId === 'string' ? text(raw.pongWorkspaceId) : undefined,
		conversationKind,
		channelId: text(decoded.channel),
	};
}

export async function fetchSlackOriginNames(
	{ thread }: OriginInput,
	origin: AgentMessageIntegrationOrigin,
): Promise<OriginNames | undefined> {
	if (origin.type !== 'slack' || origin.conversationKind === 'dm') return undefined;
	const channelName = await fetchChannelName(thread);
	return channelName ? { channelName } : undefined;
}

function slackConversationKind(
	raw: Record<string, unknown>,
): 'dm' | 'group' | 'channel' | undefined {
	switch (raw.channel_type) {
		case 'im':
			return 'dm';
		case 'mpim':
			return 'group';
		case 'channel':
		case 'group':
			return 'channel';
		case undefined:
			return raw.type === 'app_mention' ? 'channel' : undefined;
		default:
			return undefined;
	}
}
