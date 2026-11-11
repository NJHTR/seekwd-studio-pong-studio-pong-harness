import type { ESLint } from 'eslint';
import { rules } from './rules/index.js';

const plugin = {
	meta: {
		name: 'pong-local-rules',
	},
	configs: {},
	// @ts-expect-error Rules type does not match for typescript-eslint and eslint
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

export const localRulesPlugin = {
	...plugin,
	configs: {
		recommended: {
			plugins: {
				'pong-local-rules': plugin,
			},
			rules: {
				// Seal entity content writes to the token-gated repository methods.
				'pong-local-rules/no-unsealed-workflow-entity-write': 'error',
				'pong-local-rules/no-unsealed-credentials-entity-write': 'error',
				'pong-local-rules/no-uncaught-json-parse': 'error',
				'pong-local-rules/no-json-parse-json-stringify': 'error',
				'pong-local-rules/no-unneeded-backticks': 'error',
				'pong-local-rules/no-interpolation-in-regular-string': 'error',
				'pong-local-rules/no-unused-param-in-catch-clause': 'error',
				'pong-local-rules/no-useless-catch-throw': 'error',
				'pong-local-rules/no-internal-package-import': 'error',
				'pong-local-rules/no-type-only-import-in-di': 'error',
				'pong-local-rules/no-aws-credential-discovery-imports': 'error',
				'pong-local-rules/no-application-error': 'error',
				'pong-local-rules/no-raw-enum': 'error',
				'pong-local-rules/no-dynamic-regexp': 'warn',
				'pong-local-rules/no-restricted-sleep-definition': 'error',
				'pong-local-rules/no-restricted-sleep-import': 'error',
			},
		},
	},
} satisfies ESLint.Plugin;

// oxlint loads a jsPlugin from the module default export.
export default localRulesPlugin;
