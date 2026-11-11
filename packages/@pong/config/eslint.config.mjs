import { defineConfig } from 'eslint/config';
import { backendConfig } from '@pong/eslint-config/backend';

export default defineConfig(backendConfig, {
	files: ['**/*.config.ts'],
	rules: {
		'pong-local-rules/no-untyped-config-class-field': 'error',
	},
});
