import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@pong/vitest-config/tsc-decorator-transform';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default mergeConfig(
	createVitestConfigWithDecorators({}, { pinCjs: ['@pong/backend-common', '@pong/decorators'] }),
	{
		plugins: [
			tscDecoratorTransform({ filePredicate: (fileName) => /\.config\.ts$/.test(fileName) }),
		],
		test: {
			pool: 'forks',
			setupFiles: ['./test/setup-test-folder.ts'],
			exclude: [...configDefaults.exclude, '**/dist/**'],
		},
	},
);
