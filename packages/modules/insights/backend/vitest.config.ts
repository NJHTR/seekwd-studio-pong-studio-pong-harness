import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@pong/vitest-config/tsc-decorator-transform';
import path from 'node:path';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

const entitiesDirectory = path.join('database', 'entities') + path.sep;

export default mergeConfig(
	createVitestConfigWithDecorators({}, { pinCjs: ['@pong/backend-common', '@pong/decorators'] }),
	{
		plugins: [
			tscDecoratorTransform({
				filePredicate: (fileName) =>
					fileName.includes(entitiesDirectory) || /\.config\.ts$/.test(fileName),
			}),
		],
		test: {
			pool: 'forks',
			globalSetup: ['./test/setup-sqlite.ts'],
			setupFiles: ['./test/setup-test-folder.ts'],
			exclude: [...configDefaults.exclude, '**/dist/**'],
		},
	},
);
