import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const RESTRICTED_NAMES = new Set(['sleep', 'sleepWithAbort']);
const CANONICAL_FILE = /\/@pong\/utils\/src\/sleep\.ts$/;
const EXEMPT_PACKAGES = [/\/@pong\/typeorm\//, /\/@pong\/node-cli\//];

export const NoRestrictedSleepDefinitionRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow local definitions of `sleep` and `sleepWithAbort`.',
		},
		messages: {
			noRestrictedSleepDefinition:
				'Do not define your own `{{ name }}`. Import `sleep` from `@pong/utils/sleep` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const filename = context.filename.replace(/\\/g, '/');
		if (CANONICAL_FILE.test(filename) || EXEMPT_PACKAGES.some((re) => re.test(filename))) {
			return {};
		}

		return {
			FunctionDeclaration(node) {
				if (node.id && RESTRICTED_NAMES.has(node.id.name)) {
					context.report({
						node: node.id,
						messageId: 'noRestrictedSleepDefinition',
						data: { name: node.id.name },
					});
				}
			},

			VariableDeclarator(node) {
				if (
					node.id.type === TSESTree.AST_NODE_TYPES.Identifier &&
					RESTRICTED_NAMES.has(node.id.name)
				) {
					context.report({
						node: node.id,
						messageId: 'noRestrictedSleepDefinition',
						data: { name: node.id.name },
					});
				}
			},
		};
	},
});
