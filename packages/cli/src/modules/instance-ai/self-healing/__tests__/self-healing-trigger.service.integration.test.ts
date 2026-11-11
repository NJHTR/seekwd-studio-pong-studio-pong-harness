import { mockInstance, mockLogger } from '@pong/backend-test-utils';
import { RedisClientService, PubSubEventBus, Publisher, Subscriber } from '@pong/backend-services';
import { ExecutionsConfig, GlobalConfig, InstanceAiConfig } from '@pong/config';
import { SharedWorkflowRepository } from '@pong/db';
import { PubSubMetadata } from '@pong/decorators';
import { Container } from '@pong/di';
import type { InstanceSettings } from 'pong-core';
import { Redis } from 'ioredis';
import { mock } from 'vitest-mock-extended';

import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';

import { SelfHealingInvestigationService } from '../self-healing-investigation.service';
import { SelfHealingTriggerService } from '../self-healing-trigger.service';

vi.mock('../self-healing-investigation.service', () => ({
	SelfHealingInvestigationService: vi.fn(),
}));

const host = process.env.PONG_TEST_REDIS_HOST;
const port = Number(process.env.PONG_TEST_REDIS_PORT);

describe.skipIf(!host || !port)('self-healing failure relay (real Redis)', () => {
	const logger = mockLogger();
	const config = mock<InstanceAiConfig>({ workflowSuggestionsEnabled: true });
	const ownership = mock<SharedWorkflowRepository>();
	const investigations = mockInstance(SelfHealingInvestigationService);
	const main = mock<InstanceSettings>({ instanceType: 'main', hostId: 'main' });
	const worker = mock<InstanceSettings>({ instanceType: 'worker', hostId: 'worker' });
	const executionsConfig = mock<ExecutionsConfig>({ mode: 'queue' });
	const globalConfig = Container.get(GlobalConfig);
	globalConfig.redis.prefix = `self-healing-test-${process.pid}-${Date.now()}`;
	const redis = mock<RedisClientService>();
	let publisher: Publisher;
	let subscriber: Subscriber;
	let workerTrigger: SelfHealingTriggerService;
	let mainTrigger: SelfHealingTriggerService;
	let bus: PubSubEventBus;

	beforeAll(async () => {
		redis.createClient.mockImplementation(() => new Redis({ host, port }));
		publisher = new Publisher(logger, redis, worker, executionsConfig, globalConfig);
		bus = new PubSubEventBus();
		subscriber = new Subscriber(logger, main, bus, redis, executionsConfig, globalConfig);

		mainTrigger = new SelfHealingTriggerService(config, main, publisher, ownership, logger);
		Container.set(SelfHealingTriggerService, mainTrigger);
		const registry = new PubSubRegistry(logger, main, Container.get(PubSubMetadata), bus);
		registry.init();

		workerTrigger = new SelfHealingTriggerService(config, worker, publisher, ownership, logger);

		await subscriber.subscribe(subscriber.getCommandChannel());
	});

	afterAll(() => {
		bus?.removeAllListeners();
		subscriber?.shutdown();
		publisher?.shutdown();
	});

	it('delivers consecutive failures to main without debounce or a worker-side start', async () => {
		// Test the Redis relay here. Unit tests cover investigation admission on main.
		const handleFailure = vi.spyOn(mainTrigger, 'handleFailure').mockResolvedValue();

		await Promise.all([
			workerTrigger.handleFailure({ workflowId: 'workflow-1', executionId: '1' }),
			workerTrigger.handleFailure({ workflowId: 'workflow-2', executionId: '2' }),
		]);

		await vi.waitFor(() => expect(handleFailure).toHaveBeenCalledTimes(2), { timeout: 5000 });
		expect(handleFailure).toHaveBeenNthCalledWith(1, {
			workflowId: 'workflow-1',
			executionId: '1',
		});
		expect(handleFailure).toHaveBeenNthCalledWith(2, {
			workflowId: 'workflow-2',
			executionId: '2',
		});
		expect(ownership.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(investigations.start).not.toHaveBeenCalled();
	});
});
