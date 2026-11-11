import eslint from '@eslint/js';
import { pongCommunityNodesPlugin } from '@pong/eslint-plugin-community-nodes';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import-x';
import pongNodesPlugin from 'eslint-plugin-n8n-nodes-base';
import tseslint from 'typescript-eslint';

type ConfigArray = ReturnType<typeof defineConfig>;

function createConfig(supportCloud = true): ConfigArray {
	const communityNodesRecommended = supportCloud
		? pongCommunityNodesPlugin.configs.recommended
		: pongCommunityNodesPlugin.configs.recommendedWithoutPongCloudSupport;

	return defineConfig(
		globalIgnores(['dist']),
		{
			files: ['**/*.ts'],
			extends: [
				eslint.configs.recommended,
				tseslint.configs.recommended,
				communityNodesRecommended,
				// import-x uses typescript-eslint's ESLint types for its preset.
				importPlugin.configs['flat/recommended'] as Linter.Config,
			],
			rules: {
				'prefer-spread': 'off',
				'no-console': 'error',
			},
		},
		{
			plugins: { 'pong-nodes-base': pongNodesPlugin },
			settings: {
				'import-x/resolver-next': [createTypeScriptImportResolver()],
			},
		},
		{
			files: ['package.json', '**/*.node.json'],
			// Apply the community-nodes recommended config here as well so that
			// rules for JSON files fire. The `**/*.ts` block above scopes its
			// `extends:` to TypeScript only, so ESLint does not lint JSON there —
			// see CE-1023 for the analogous issue in @pong/scan-community-package.
			extends: [communityNodesRecommended],
			rules: {
				...pongNodesPlugin.configs.community.rules,
			},
			languageOptions: {
				// typescript-eslint bundles a parser type that differs from ESLint's parser type.
				parser: tseslint.parser as Linter.Parser,
				parserOptions: {
					extraFileExtensions: ['.json'],
				},
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			rules: {
				...pongNodesPlugin.configs.credentials.rules,
				// Not valid for community nodes
				'pong-nodes-base/cred-class-field-documentation-url-miscased': 'off',
				// @pong/eslint-plugin-community-nodes credential-password-field rule is more accurate
				'pong-nodes-base/cred-class-field-type-options-password-missing': 'off',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			rules: {
				...pongNodesPlugin.configs.nodes.rules,
				// Inputs and outputs can be enum instead of string "main"
				'pong-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
				'pong-nodes-base/node-class-description-outputs-wrong': 'off',
				// Sometimes the 3rd party API does have a maximum limit, so maxValue is valid
				'pong-nodes-base/node-param-type-options-max-value-present': 'off',
			},
		},
	);
}
export const config: ConfigArray = createConfig();
export const configWithoutCloudSupport: ConfigArray = createConfig(false);

export default config;
