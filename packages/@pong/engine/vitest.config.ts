import { createVitestConfig } from '@pong/vitest-config/node';

export default createVitestConfig({
	exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
});
