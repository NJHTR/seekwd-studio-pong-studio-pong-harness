import { SKILL_SYNC_FLAG } from '@pong/api-types';
import type { User } from '@pong/db';
import { Service } from '@pong/di';
import { NotFoundError } from '@pong/errors';

import { PostHogClient } from '@/posthog';

import { SkillsGate } from './skills-gate';

/**
 * Whether a user can use Skill Sync: skills are on, and the per-user PostHog flag
 * `SKILL_SYNC_FLAG` is on. `PostHogClient` caches per user and applies the local overrides,
 * so this gate needs no cache of its own.
 */
@Service()
export class SkillSyncFlagGate {
	constructor(
		private readonly skillsGate: SkillsGate,
		private readonly postHog: PostHogClient,
	) {}

	async isEnabled(user: User): Promise<boolean> {
		if (!this.skillsGate.isEnabled) return false;
		const flags = await this.postHog.getFeatureFlags(user);
		return flags?.[SKILL_SYNC_FLAG] === true;
	}

	// 404, not 403: a surface behind a flag that is off looks unknown, not forbidden.
	async assertEnabled(user: User): Promise<void> {
		if (!(await this.isEnabled(user))) throw new NotFoundError('Not found');
	}
}
