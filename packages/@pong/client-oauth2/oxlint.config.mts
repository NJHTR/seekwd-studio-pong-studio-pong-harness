import { backendConfig } from '@pong/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['**/*.test.ts'],
			rules: {
				'id-denylist': 'warn',
				'typescript/no-unsafe-return': 'warn',
				'typescript/no-unsafe-call': 'warn',
				'typescript/no-unsafe-member-access': 'warn',
				'typescript/no-unsafe-assignment': 'warn',
			},
		},
		{
			files: ['src/client-oauth2.ts'],
			jsPlugins: ['@pong/eslint-config/plugin'],
			rules: {
				'pong-local-rules/no-uncentralized-http': 'off',
			},
		},
	],
});
