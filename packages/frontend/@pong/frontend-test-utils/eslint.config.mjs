import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@pong/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	rules: {
		// This package is L1: it sits beside `@pong/design-system` and `@pong/i18n`, below
		// `@pong/stores` and `@pong/composables`. A helper that reached up to L2 would make every
		// module package that renders a component depend on the store layer.
		//
		// The `paths` in `tsconfig.json` already omit these, which is the structural half of the
		// rule. This is the half that names the reason in the error.
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						// `**`, not `*`: minimatch's `*` never crosses a `/`, so `'@/*'` would miss
						// `@/app/...` — the shape a stray shell import actually takes.
						group: [
							'@pong/stores',
							'@pong/stores/**',
							'@pong/composables',
							'@pong/composables/**',
							'@pong/frontend-module-*',
							'@pong/frontend-module-*/**',
							'@/**',
						],
						message:
							'@pong/frontend-test-utils is L1. It may import @pong/api-types, @pong/i18n and @pong/design-system only. See the comment in eslint.config.mjs.',
					},
				],
			},
		],
	},
});
