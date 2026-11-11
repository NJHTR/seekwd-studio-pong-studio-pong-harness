import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@pong/eslint-config/backend';

export default defineConfig(
	backendConfig,
	globalIgnores(['scenarios/**', 'scripts/**']),
	{
		rules: {
			complexity: 'error',
		},
	},
	{
		files: ['./src/commands/*.ts'],
		rules: {
			'import-x/no-default-export': 'off',
		},
	},
);
