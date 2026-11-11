import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import path from 'node:path';
import { mergeConfig } from 'vite';

export default mergeConfig(
	createVitestConfigWithDecorators({
		testTimeout: 10_000,
	}),
	{
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
	},
);
