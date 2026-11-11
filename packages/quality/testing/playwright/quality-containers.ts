import { containerFixtures, type ContainerWorkerFixtures } from './fixtures/containers';
import { observabilityFixtures, type ObservabilityTestFixtures } from './fixtures/observability';
import { test as base } from './quality-test';

export { expect } from './quality-test';
export type { ContainerWorkerFixtures } from './fixtures/containers';
export type { PONGConfig, PONGStack } from 'pong-containers/stack';

export const test = base.extend<ObservabilityTestFixtures, ContainerWorkerFixtures>({
	...containerFixtures,
	...observabilityFixtures,
});
