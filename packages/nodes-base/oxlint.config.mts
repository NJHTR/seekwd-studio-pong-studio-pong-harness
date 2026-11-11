import { nodesConfig } from '@pong/oxlint-config/nodes';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [nodesConfig],
	options: { typeAware: true },
	jsPlugins: [
		{
			name: '@pong/community-nodes',
			specifier: '@pong/eslint-plugin-community-nodes',
		},
	],
	ignorePatterns: [
		'scenarios/**',
		'scripts/**',
		'nodes/Databricks/eslint-user-agent-restriction.mjs',
		'nodes/Kafka/eslint-import-restrictions.mjs',
	],
	rules: {
		'@pong/community-nodes/credential-documentation-url': ['error', { allowSlugs: true }],
		'@pong/community-nodes/no-builder-hint-leakage': 'error',
		'pong-local-rules/require-escaped-query-values': 'error',
	},
	overrides: [
		{
			files: ['nodes/**/*.ts', 'credentials/**/*.ts', 'utils/**/*.ts', 'test/**/*.ts'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': 'warn',
				'pong-local-rules/no-dynamic-regexp': 'off',
				'no-constant-condition': 'warn',
				'no-control-regex': 'warn',
				'no-dupe-else-if': 'warn',
				'no-ex-assign': 'warn',
				'no-fallthrough': 'warn',
				'typescript/ban-ts-comment': 'off',
				'typescript/no-deprecated': 'warn',
				'typescript/prefer-promise-reject-errors': 'warn',
				// The residual ESLint pass enforces these rules on the same paths.
				'import/no-duplicates': 'off',
				'no-self-assign': 'off',
				'no-unsafe-optional-chaining': 'off',
			},
		},
		{
			files: ['nodes/**/*.ts'],
			excludeFiles: [
				'**/*.test.ts',
				'**/test/**',
				'**/tests/**',
				'**/__test__/**',
				'**/__tests__/**',
			],
			rules: { 'pong-local-rules/no-dynamic-regexp': 'error' },
		},
		{
			files: ['nodes/**/*.ts'],
			rules: { 'pong-nodes-base/node-filename-against-convention': 'off' },
		},
		{
			files: ['**/*.test.ts', '**/test/**/*.ts'],
			rules: { 'pong-local-rules/require-escaped-query-values': 'off' },
		},
	],
});
