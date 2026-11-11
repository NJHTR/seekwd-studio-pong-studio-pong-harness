import { backendConfig } from '@pong/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['stryker.config.mjs', 'vitest.stryker.config.ts', '.stryker-tmp/**'],
	overrides: [
		{
			files: ['./src/**/*.ts'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: ['@pong/db', '@pong/di', '@pong/typeorm'],
					},
				],
			},
		},
	],
});
