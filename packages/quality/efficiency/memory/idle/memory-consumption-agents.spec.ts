import { runMemoryBaseline } from './memory-baseline.test.utils';
import { test } from 'pong-playwright/containers';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			PONG_ENABLED_MODULES: 'agents',
			PONG_AI_ANTHROPIC_KEY: 'fake-key',
		},
	},
});

runMemoryBaseline({ name: 'agents', owner: 'Agent' });
