import { defineConfig } from 'eslint/config';
import { backendConfig } from '@pong/eslint-config/backend';

export default defineConfig(
	backendConfig,
	{
		ignores: ['dist/**'],
	},
	{
		files: ['vitest.config.mts'],
		rules: {
			// The test runner is a devDependency by design; this config only runs locally and in CI.
			'import-x/no-extraneous-dependencies': 'off',
		},
	},
);
