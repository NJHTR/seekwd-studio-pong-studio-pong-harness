import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@pong/vitest-config/tsc-decorator-transform';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default mergeConfig(
	createVitestConfigWithDecorators({}, { pinCjs: ['@pong/backend-common', '@pong/decorators'] }),
	{
		plugins: [
			tscDecoratorTransform({
				filePredicate: (fileName) => /\.(entity|config)\.ts$/.test(fileName),
			}),
		],
		test: {
			pool: 'forks',
			testTimeout: 10_000,
			hookTimeout: 30_000,
			env: { PONG_LOG_LEVEL: 'silent', DB_TYPE: 'sqlite', DB_SQLITE_POOL_SIZE: '4' },
			setupFiles: ['./test/setup-test-folder.ts'],
			exclude: [...configDefaults.exclude, '**/dist/**'],
		},
	},
);
