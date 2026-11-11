import { defineConfig } from 'eslint/config';
import { nodesConfig } from '@pong/eslint-config/nodes';
import { pongCommunityNodesPlugin } from '@pong/eslint-plugin-community-nodes';

export default defineConfig(nodesConfig, {
	plugins: {
		'@pong/community-nodes': pongCommunityNodesPlugin,
	},
	rules: {
		'@pong/community-nodes/no-builder-hint-leakage': 'error',

		'@pong/community-nodes/credential-documentation-url': ['error', { allowSlugs: true }],

		'@typescript-eslint/naming-convention': ['error', { selector: 'memberLike', format: null }],
		'@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
	},
});
