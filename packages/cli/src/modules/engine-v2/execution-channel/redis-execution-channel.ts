import type { Logger } from '@pong/backend-common';
import { GlobalConfig } from '@pong/config';
import { Container } from '@pong/di';
import type { ExecutionChannelTopic } from '@pong/engine';

export type RedisExecutionChannelNameGenerator = (
	topic: ExecutionChannelTopic,
	executionId: string,
) => string;

/** Both planes must derive the same channel name, so they share this helper. */
async function createChannelNameGenerator(): Promise<RedisExecutionChannelNameGenerator> {
	const { RedisClientService } = await import('@pong/backend-services');
	const prefix = Container.get(RedisClientService).toValidPrefix(
		Container.get(GlobalConfig).redis.prefix,
	);

	return (topic, executionId) => `${prefix}:engine-v2-${topic}:${executionId}`;
}

/** Creates the data plane end of the Redis execution channel. */
export async function createRedisExecutionChannelPublisher(logger: Logger) {
	const { RedisClientService } = await import('@pong/backend-services');
	const { RedisExecutionChannelPublisher } = await import('./redis-execution-channel-publisher.js');

	return new RedisExecutionChannelPublisher(
		Container.get(RedisClientService).createClient({ type: 'publisher(pong)' }),
		await createChannelNameGenerator(),
		logger,
	);
}

/** Creates and starts the control plane end of the Redis execution channel. */
export async function startRedisExecutionChannelSubscriber(logger: Logger) {
	const { RedisClientService } = await import('@pong/backend-services');
	const { RedisExecutionChannelSubscriber } = await import(
		'./redis-execution-channel-subscriber.js'
	);

	const subscriber = new RedisExecutionChannelSubscriber(
		Container.get(RedisClientService).createClient({ type: 'subscriber(pong)' }),
		await createChannelNameGenerator(),
		logger,
	);
	try {
		await subscriber.start();
	} catch (error) {
		await subscriber.stop();
		throw error;
	}

	return subscriber;
}
