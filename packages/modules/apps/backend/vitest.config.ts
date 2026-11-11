import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@pong/vitest-config/tsc-decorator-transform';
import { mergeConfig } from 'vite';

export default mergeConfig(
	createVitestConfigWithDecorators({}, { pinCjs: ['@pong/backend-common', '@pong/decorators'] }),
	{
		plugins: [
			tscDecoratorTransform({ filePredicate: (fileName) => /\.entity\.ts$/.test(fileName) }),
		],
		test: {
			exclude: ['**/node_modules/**', '**/dist/**'],
		},
	},
);
