import type { ESLint, Linter } from 'eslint';

import pkg from '../package.json' with { type: 'json' };
import { rules } from './rules/index.js';

const plugin = {
	meta: {
		name: pkg.name,
		version: pkg.version,
		namespace: '@pong/design-system',
	},
	// @ts-expect-error Rules type does not match for typescript-eslint and eslint
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

const plugins = {
	'@pong/design-system': plugin,
};

const configs = {
	recommended: {
		files: ['**/*.vue'],
		plugins,
		rules: {
			'@pong/design-system/no-direct-component-imports': 'error',
			'@pong/design-system/require-teleported-tooltip-in-dropdown': 'error',
		},
	},
	componentImports: {
		files: ['**/*.{ts,tsx}'],
		plugins,
		rules: {
			'@pong/design-system/no-direct-component-imports': 'error',
		},
	},
} satisfies Record<string, Linter.Config>;

const pluginWithConfigs = { ...plugin, configs } satisfies ESLint.Plugin;

export default pluginWithConfigs;
export { configs, rules };
