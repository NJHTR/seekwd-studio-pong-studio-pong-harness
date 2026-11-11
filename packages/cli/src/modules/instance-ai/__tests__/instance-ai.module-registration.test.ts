import { mockInstance } from '@pong/backend-test-utils';
import { LifecycleMetadata, PubSubMetadata } from '@pong/decorators';
import { Container } from '@pong/di';
import { InstanceSettings } from 'pong-core';

import { InstanceAiModule } from '../instance-ai.module';

it('registers self-healing handlers during worker module initialization', async () => {
	mockInstance(InstanceSettings, { instanceType: 'worker' });
	const lifecycle = Container.get(LifecycleMetadata);
	const pubsub = Container.get(PubSubMetadata);
	const completionHandler = expect.objectContaining({
		methodName: 'onWorkflowExecuteAfter',
		eventName: 'workflowExecuteAfter',
	});
	const failureHandler = expect.objectContaining({
		methodName: 'handleFailure',
		eventName: 'self-healing-failure',
		filter: { instanceType: 'main' },
	});

	// Only module initialization must import the trigger and register its decorators.
	expect(lifecycle.getHandlers()).not.toContainEqual(completionHandler);
	expect(pubsub.getHandlers()).not.toContainEqual(failureHandler);

	await new InstanceAiModule().init();

	expect(lifecycle.getHandlers()).toContainEqual(completionHandler);
	expect(pubsub.getHandlers()).toContainEqual(failureHandler);
});
