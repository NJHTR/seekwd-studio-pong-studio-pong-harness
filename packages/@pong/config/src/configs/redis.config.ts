import { Config, Env } from '../decorators';

@Config
export class RedisConfig {
	/** Key prefix for all Redis keys used by pong (avoids clashes when sharing a Redis instance). */
	@Env('PONG_REDIS_KEY_PREFIX')
	prefix: string = 'pong';
}
