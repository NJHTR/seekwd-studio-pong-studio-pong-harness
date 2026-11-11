import tseslint from 'typescript-eslint';
import nodesBasePlugin from 'eslint-plugin-n8n-nodes-base';

import { backendConfig } from './backend.js';

/**
 * The two packages that ship nodes: `pong-nodes-base` and
 * `@pong/nodes-langchain`.
 *
 * They had kept the same ~100 `pong-nodes-base/*` rules in their own configs,
 * which had already drifted (a duplicated key in each). The rules describe the
 * node and credential file formats, so they belong to the node format, not to
 * one package.
 *
 * The globs stay relative: ESLint resolves `files` against the config that
 * consumes this one, so `credentials/*.ts` means each package's own tree.
 *
 * The `@pong/community-nodes` rules stay in the two packages. That plugin peer-
 * depends on `pong-workflow`, which reaches this package again through
 * `@pong/utils`, and turbo's build graph rejects the cycle. Only the two rules
 * both packages agree on are duplicated, against 97 lifted here.
 */
export const nodesConfig = tseslint.config(
	backendConfig,
	{
		plugins: {
			'pong-nodes-base': nodesBasePlugin,
		},

		rules: {
			// A node file is `Slack.node.ts` and a credential is
			// `SlackApi.credentials.ts`, so the kebab-case default cannot apply.
			'unicorn/filename-case': 'off',

			'pong-local-rules/no-dynamic-regexp': 'error',
			'@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],

			/**
			 * Retired for both nodes packages, which had each downgraded all of
			 * these. Node source is largely generated or transcribed from a
			 * vendor API, so it does not read like the rest of the repo.
			 */
			'@typescript-eslint/no-base-to-string': 'off',
			'@typescript-eslint/no-duplicate-type-constituents': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			'@typescript-eslint/prefer-optional-chain': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			eqeqeq: 'off',
			'id-denylist': 'off',
			'import-x/extensions': 'off',
			'pong-local-rules/no-argument-spread': 'off',
			'no-async-promise-executor': 'off',
			'no-case-declarations': 'off',
			'no-extra-boolean-cast': 'off',
			'no-prototype-builtins': 'off',
			'no-useless-escape': 'off',
		},
	},
	{
		files: ['credentials/*.ts'],
		rules: {
			'pong-nodes-base/cred-class-field-authenticate-type-assertion': 'error',
			'pong-nodes-base/cred-class-field-display-name-missing-oauth2': 'error',
			'pong-nodes-base/cred-class-field-display-name-miscased': 'error',
			'pong-nodes-base/cred-class-field-documentation-url-missing': 'error',
			'pong-nodes-base/cred-class-field-name-missing-oauth2': 'error',
			'pong-nodes-base/cred-class-field-name-unsuffixed': 'error',
			'pong-nodes-base/cred-class-field-name-uppercase-first-char': 'error',
			'pong-nodes-base/cred-class-field-properties-assertion': 'error',
			'pong-nodes-base/cred-class-field-type-options-password-missing': 'error',
			'pong-nodes-base/cred-class-name-missing-oauth2-suffix': 'error',
			'pong-nodes-base/cred-class-name-unsuffixed': 'error',
			'pong-nodes-base/cred-filename-against-convention': 'error',
		},
	},
	{
		files: ['nodes/**/*.ts'],
		rules: {
			'pong-nodes-base/node-class-description-credentials-name-unsuffixed': 'error',
			'pong-nodes-base/node-class-description-display-name-unsuffixed-trigger-node': 'error',
			'pong-nodes-base/node-class-description-empty-string': 'error',
			'pong-nodes-base/node-class-description-icon-not-svg': 'off',
			'pong-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'pong-nodes-base/node-class-description-inputs-wrong-trigger-node': 'error',
			'pong-nodes-base/node-class-description-missing-subtitle': 'error',
			'pong-nodes-base/node-class-description-non-core-color-present': 'error',
			'pong-nodes-base/node-class-description-name-miscased': 'error',
			'pong-nodes-base/node-class-description-name-unsuffixed-trigger-node': 'error',
			'pong-nodes-base/node-class-description-outputs-wrong': 'off',
			'pong-nodes-base/node-dirname-against-convention': 'error',
			'pong-nodes-base/node-execute-block-double-assertion-for-items': 'error',
			'pong-nodes-base/node-execute-block-wrong-error-thrown': 'error',
			'pong-nodes-base/node-filename-against-convention': 'error',
			'pong-nodes-base/node-param-array-type-assertion': 'error',
			'pong-nodes-base/node-param-color-type-unused': 'error',
			'pong-nodes-base/node-param-default-missing': 'error',
			'pong-nodes-base/node-param-default-wrong-for-boolean': 'error',
			'pong-nodes-base/node-param-default-wrong-for-collection': 'error',
			'pong-nodes-base/node-param-default-wrong-for-fixed-collection': 'error',
			'pong-nodes-base/node-param-default-wrong-for-multi-options': 'error',
			'pong-nodes-base/node-param-default-wrong-for-number': 'error',
			'pong-nodes-base/node-param-default-wrong-for-simplify': 'error',
			'pong-nodes-base/node-param-default-wrong-for-string': 'error',
			'pong-nodes-base/node-param-description-boolean-without-whether': 'error',
			'pong-nodes-base/node-param-description-comma-separated-hyphen': 'error',
			'pong-nodes-base/node-param-description-empty-string': 'error',
			'pong-nodes-base/node-param-description-excess-final-period': 'error',
			'pong-nodes-base/node-param-description-excess-inner-whitespace': 'error',
			'pong-nodes-base/node-param-description-identical-to-display-name': 'error',
			'pong-nodes-base/node-param-description-line-break-html-tag': 'error',
			'pong-nodes-base/node-param-description-lowercase-first-char': 'error',
			'pong-nodes-base/node-param-description-miscased-id': 'error',
			'pong-nodes-base/node-param-description-miscased-json': 'error',
			'pong-nodes-base/node-param-description-miscased-url': 'error',
			'pong-nodes-base/node-param-description-missing-final-period': 'error',
			'pong-nodes-base/node-param-description-missing-for-ignore-ssl-issues': 'error',
			'pong-nodes-base/node-param-description-missing-for-return-all': 'error',
			'pong-nodes-base/node-param-description-missing-for-simplify': 'error',
			'pong-nodes-base/node-param-description-missing-from-dynamic-multi-options': 'error',
			'pong-nodes-base/node-param-description-missing-from-dynamic-options': 'error',
			'pong-nodes-base/node-param-description-missing-from-limit': 'error',
			'pong-nodes-base/node-param-description-unencoded-angle-brackets': 'error',
			'pong-nodes-base/node-param-description-unneeded-backticks': 'error',
			'pong-nodes-base/node-param-description-untrimmed': 'error',
			'pong-nodes-base/node-param-description-url-missing-protocol': 'error',
			'pong-nodes-base/node-param-description-weak': 'error',
			'pong-nodes-base/node-param-description-wrong-for-dynamic-multi-options': 'error',
			'pong-nodes-base/node-param-description-wrong-for-dynamic-options': 'error',
			'pong-nodes-base/node-param-description-wrong-for-ignore-ssl-issues': 'error',
			'pong-nodes-base/node-param-description-wrong-for-limit': 'error',
			'pong-nodes-base/node-param-description-wrong-for-return-all': 'error',
			'pong-nodes-base/node-param-description-wrong-for-simplify': 'error',
			'pong-nodes-base/node-param-description-wrong-for-upsert': 'error',
			'pong-nodes-base/node-param-display-name-excess-inner-whitespace': 'error',
			'pong-nodes-base/node-param-display-name-miscased-id': 'error',
			'pong-nodes-base/node-param-display-name-miscased': 'error',
			'pong-nodes-base/node-param-display-name-not-first-position': 'error',
			'pong-nodes-base/node-param-display-name-untrimmed': 'error',
			'pong-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options': 'error',
			'pong-nodes-base/node-param-display-name-wrong-for-dynamic-options': 'error',
			'pong-nodes-base/node-param-display-name-wrong-for-simplify': 'error',
			'pong-nodes-base/node-param-display-name-wrong-for-update-fields': 'error',
			'pong-nodes-base/node-param-min-value-wrong-for-limit': 'error',
			'pong-nodes-base/node-param-multi-options-type-unsorted-items': 'error',
			'pong-nodes-base/node-param-name-untrimmed': 'error',
			'pong-nodes-base/node-param-operation-option-action-wrong-for-get-many': 'error',
			'pong-nodes-base/node-param-operation-option-description-wrong-for-get-many': 'error',
			'pong-nodes-base/node-param-operation-option-without-action': 'error',
			'pong-nodes-base/node-param-operation-without-no-data-expression': 'error',
			'pong-nodes-base/node-param-option-description-identical-to-name': 'error',
			'pong-nodes-base/node-param-option-name-containing-star': 'error',
			'pong-nodes-base/node-param-option-name-duplicate': 'error',
			'pong-nodes-base/node-param-option-name-wrong-for-get-many': 'error',
			'pong-nodes-base/node-param-option-name-wrong-for-upsert': 'error',
			'pong-nodes-base/node-param-option-value-duplicate': 'error',
			'pong-nodes-base/node-param-options-type-unsorted-items': 'error',
			'pong-nodes-base/node-param-placeholder-miscased-id': 'error',
			'pong-nodes-base/node-param-placeholder-missing-email': 'error',
			'pong-nodes-base/node-param-required-false': 'error',
			'pong-nodes-base/node-param-resource-with-plural-option': 'error',
			'pong-nodes-base/node-param-resource-without-no-data-expression': 'error',
			'pong-nodes-base/node-param-type-options-missing-from-limit': 'error',
			'pong-nodes-base/node-param-type-options-password-missing': 'error',
		},
	},
	{
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__test__/**/*.ts', '**/__tests__/**/*.ts'],
		rules: {
			'import-x/no-extraneous-dependencies': 'off',
			'pong-nodes-base/node-filename-against-convention': 'off',
			'pong-local-rules/no-dynamic-regexp': 'off',
		},
	},
);
