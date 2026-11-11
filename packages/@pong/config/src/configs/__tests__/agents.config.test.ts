import { Container } from '@pong/di';

import { AgentsConfig } from '../agents.config';

describe('AgentsConfig plan tools', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		Container.reset();
	});

	it.each([
		['', false],
		['false', false],
		['true', true],
	])('parses PONG_AGENTS_PLAN_TOOLS_ENABLED=%s as %s', (value, expected) => {
		vi.stubEnv('PONG_AGENTS_PLAN_TOOLS_ENABLED', value);
		Container.reset();
		expect(Container.get(AgentsConfig).planToolsEnabled).toBe(expected);
	});
});
