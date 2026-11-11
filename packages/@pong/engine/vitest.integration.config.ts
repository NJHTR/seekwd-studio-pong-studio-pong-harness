import { createVitestConfig } from '@pong/vitest-config/node';

export default createVitestConfig({
	include: ['**/*.integration.test.ts'],
});
