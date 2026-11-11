import { runMemoryBaseline } from './memory-baseline.test.utils';
import { test } from 'pong-playwright/containers';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			PONG_ENABLED_MODULES: 'instance-ai',
			PONG_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			PONG_INSTANCE_AI_MODEL_API_KEY: 'fake-key',
		},
	},
});

runMemoryBaseline({ name: 'instance-ai', owner: 'instanceAI' });
