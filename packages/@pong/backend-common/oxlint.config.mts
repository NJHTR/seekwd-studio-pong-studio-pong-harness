import { backendConfig } from '@pong/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['**/*.test.ts'],
			jsPlugins: ['@pong/eslint-config/plugin'],
			rules: {
				'pong-local-rules/no-uncaught-json-parse': 'warn',
				'typescript/no-unsafe-return': 'warn',
				'typescript/no-unsafe-assignment': 'warn',
				'typescript/no-unsafe-argument': 'warn',
				'typescript/unbound-method': 'warn',
			},
		},
	],
});
