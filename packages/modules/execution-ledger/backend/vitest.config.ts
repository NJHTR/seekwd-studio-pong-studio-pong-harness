import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@pong/vitest-config/tsc-decorator-transform';
import path from 'node:path';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

const entitiesDirectory = path.join('database', 'entities') + path.sep;

export default mergeConfig(createVitestConfigWithDecorators({}, { pinCjs: ['@pong/decorators'] }), {
	plugins: [
		tscDecoratorTransform({
			filePredicate: (fileName) => fileName.includes(entitiesDirectory),
		}),
	],
	test: {
		pool: 'forks',
		setupFiles: ['./test/setup-test-folder.ts'],
		exclude: [...configDefaults.exclude, '**/dist/**'],
	},
});
