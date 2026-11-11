import { runMemoryBaseline } from './memory-baseline.test.utils';
import { test } from 'pong-playwright/containers';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			PONG_DISABLED_MODULES: 'mcp',
		},
	},
});

runMemoryBaseline({ name: 'no-mcp-only', owner: 'Context' });
