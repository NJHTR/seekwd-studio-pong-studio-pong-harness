export type RedisClientType = PongRedisClientType | BullRedisClientType;

/**
 * Redis client used by pong.
 *
 * - `subscriber(pong)` to listen for messages from scaling mode pubsub channels
 * - `publisher(pong)` to send messages into scaling mode pubsub channels
 * - `cache(pong)` for caching operations (variables, resource ownership, etc.)
 */
type PongRedisClientType =
	| 'subscriber(pong)'
	| 'publisher(pong)'
	| 'cache(pong)'
	| 'registry(pong)'
	| 'leader(pong)'
	| 'lock(pong)'
	| 'rate-limit(pong)';

/**
 * Redis client used internally by Bull. Suffixed with `(bull)` at `ScalingService.setupQueue`.
 *
 * - `subscriber(bull)` for event listening
 * - `client(bull)` for general queue operations
 * - `bclient(bull)` for blocking operations when processing jobs
 */
type BullRedisClientType = 'subscriber(bull)' | 'client(bull)' | 'bclient(bull)';
