import { runMemoryBaseline } from './memory-baseline.test.utils';
import { test } from 'pong-playwright/containers';

test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			PONG_DISABLED_MODULES: 'mcp-registry',
		},
	},
});

runMemoryBaseline({ name: 'no-mcp-registry', owner: 'NODES' });
