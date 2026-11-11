import { createVitestConfigWithDecorators } from '@pong/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@pong/vitest-config/tsc-decorator-transform';
import path from 'node:path';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

import { workspaceDistExternals } from './vitest.workspace-externals';

/**
 * Note on alias order/specificity: Vite matches a string alias only when the
 * import equals it or starts with `alias + '/'`, so `@` matches `@/...` but not
 * `@pong/...` or `@test/...`. The entries are therefore non-overlapping.
 */
const alias = {
	'@pong/backend-module-data-table/testing': path.resolve(
		__dirname,
		'../modules/data-table/backend/src/testing.ts',
	),
	'@pong/backend-module-data-table/module': path.resolve(
		__dirname,
		'../modules/data-table/backend/src/data-table.module.ts',
	),
	'@pong/backend-module-data-table': path.resolve(
		__dirname,
		'../modules/data-table/backend/src/index.ts',
	),
	'@test-integration': path.resolve(__dirname, 'test/integration/shared'),
	'@test': path.resolve(__dirname, 'test/shared'),
	'@pong/backend-module-insights/testing': path.resolve(
		__dirname,
		'../modules/insights/backend/src/testing.ts',
	),
	'@pong/backend-module-insights/module': path.resolve(
		__dirname,
		'../modules/insights/backend/src/insights.module.ts',
	),
	'@pong/backend-module-insights/config': path.resolve(
		__dirname,
		'../modules/insights/backend/src/insights.config.ts',
	),
	'@pong/backend-module-insights': path.resolve(
		__dirname,
		'../modules/insights/backend/src/index.ts',
	),
	'@pong/backend-module-workflow-builder/module': path.resolve(
		__dirname,
		'../modules/workflow-builder/backend/src/workflow-builder.module.ts',
	),
	'@pong/backend-module-workflow-builder': path.resolve(
		__dirname,
		'../modules/workflow-builder/backend/src/index.ts',
	),
	'@pong/mcp-apps/server': path.resolve(__dirname, '../@pong/mcp-apps/src/server/index.ts'),
	'@pong/telemetry': path.resolve(__dirname, '../@pong/telemetry/src'),
	'@': path.resolve(__dirname, 'src'),
};

/**
 * Shared base for every cli test suite (unit, integration, migration). The
 * variant configs (`vitest.config.*.ts`) merge their own `include`/pool tweaks
 * on top of this.
 */
export const baseConfig = mergeConfig(createVitestConfigWithDecorators(), {
	// `workspaceDistExternals` must run before `tscDecoratorTransform`: once a
	// workspace package is externalized to its built dist, the decorator transform
	// never sees its entity and config source files.
	plugins: [
		workspaceDistExternals(),
		tscDecoratorTransform({ filePredicate: (fileName) => /\.(entity|config)\.ts$/.test(fileName) }),
	],
	resolve: { alias },
	test: {
		// Run each test file in its own forked process.
		// This is load-bearing: cli tests register service
		// mocks into the `@pong/di` Container (`mockInstance`), and a shared worker
		// would leak that state across files.
		pool: 'forks',
		globalSetup: ['./test/global-setup.ts'],
		setupFiles: [
			'./test/setup-test-folder.ts',
			'./test/setup-mocks.ts',
			'./test/setup-encryption-key.ts',
			'./test/extend-expect.ts',
		],
		// Vitest's default exclude does not cover dist; compiled test files left in
		// dist would otherwise be collected and fail as CJS.
		exclude: [...configDefaults.exclude, '**/dist/**'],
		coverage: {
			exclude: ['src/databases/migrations/**', ...(configDefaults.coverage.exclude ?? [])],
		},
	},
});
