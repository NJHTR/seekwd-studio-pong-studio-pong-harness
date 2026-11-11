import { Config, Env } from '@pong/config';
import { z } from 'zod';

/** Skill Sync settings. */
@Config
export class SkillSyncConfig {
	/** How often pong checks each skill source for updates, in seconds. At least one minute. */
	@Env('PONG_SKILL_SYNC_CHECK_INTERVAL_SECONDS', z.number({ coerce: true }).int().min(60))
	checkIntervalSeconds: number = 3600;
}
