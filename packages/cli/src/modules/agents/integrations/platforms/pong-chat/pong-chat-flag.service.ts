import { AGENTS_PONG_CHAT_FLAG } from '@pong/api-types';
import type { User } from '@pong/db';
import { Service } from '@pong/di';

import { PostHogClient } from '@/posthog';

/** Backend read of the pong Chat experiment flag, for the paths the editor's gate cannot reach. */
@Service()
export class PongChatFlagService {
	constructor(private readonly postHogClient: PostHogClient) {}

	/** Mirrors the editor's `useAgentsPongChatFlag`: every variant except `control` is on. Fails closed. */
	async isEnabledFor(user: User): Promise<boolean> {
		try {
			const variant = (await this.postHogClient.getFeatureFlags(user))[AGENTS_PONG_CHAT_FLAG];
			return typeof variant === 'string' && variant !== 'control';
		} catch {
			return false;
		}
	}
}
