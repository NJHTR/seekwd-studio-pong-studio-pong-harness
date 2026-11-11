import { backendConfig } from '@pong/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['**/*.config.ts'],
			jsPlugins: ['@pong/eslint-config/plugin'],
			rules: {
				'pong-local-rules/no-untyped-config-class-field': 'error',
			},
		},
	],
});
