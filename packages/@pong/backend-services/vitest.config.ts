import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import { configDefaults, mergeConfig } from 'vitest/config';

export default mergeConfig(createVitestConfigWithDecorators(), {
	test: {
		setupFiles: ['./test/setup-test-folder.ts'],
		// One fork per file: tests register mocks in the shared `@pong/di` Container.
		pool: 'forks',
		// Vitest's default exclude does not cover dist; stale compiled tests there fail as CJS.
		exclude: [...configDefaults.exclude, '**/dist/**'],
	},
});
